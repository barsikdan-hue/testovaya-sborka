import {
  AnalysisResponse,
  ConversationState,
  TranscriptTurn,
} from '../types';
import { isSubstantiveClientTurn } from './objectionEngine';

export interface AnalysisPayload {
  sessionId: string;
  revision: number;
  newTurns: TranscriptTurn[];
  recentTurns: TranscriptTurn[];
  currentState: ConversationState;
  reason?: string;
}

export class AnalysisProvider {
  private currentSessionId: string | null = null;
  private inFlightRevision: number | null = null;
  private latestAcknowledgedRevision: number = 0;
  private pendingPayload: AnalysisPayload | null = null;
  private debounceTimer: any = null;
  private activeAbortController: AbortController | null = null;
  private softThresholdTimer: any = null;
  private hardTimeoutTimer: any = null;

  // Quota optimization state & protections
  private analyzedTurnIds: Set<string> = new Set();
  private analyzedRevisions: Set<number> = new Set();
  private lastAnalysisTimestamp: number = 0;
  private lastValidResponse: AnalysisResponse | null = null;

  // Diagnostics counters
  private totalAnalysisRequestsCount: number = 0;
  private cancelledRequestsCount: number = 0;
  private rejectedRequestsCount: number = 0;
  private lastRejectedReason: string | null = null;
  private lastRequestTimestamp: number | null = null;
  private lastRequestReason: string | null = null;

  public setSession(sessionId: string) {
    this.cancelPending();
    this.currentSessionId = sessionId;
    this.inFlightRevision = null;
    this.latestAcknowledgedRevision = 0;
    this.analyzedTurnIds.clear();
    this.analyzedRevisions.clear();
    this.lastAnalysisTimestamp = 0;
    this.lastValidResponse = null;
    this.lastRequestTimestamp = null;
    this.lastRequestReason = null;
  }

  public getStats() {
    return {
      requestsCount: this.totalAnalysisRequestsCount,
      cancelledCount: this.cancelledRequestsCount,
      rejectedCount: this.rejectedRequestsCount,
      lastRejectedReason: this.lastRejectedReason,
      lastRequestTime: this.lastRequestTimestamp,
      lastRequestReason: this.lastRequestReason,
    };
  }

  public getLastValidResponse(): AnalysisResponse | null {
    return this.lastValidResponse;
  }

  /**
   * Verify all conditions before allowing an analysis request:
   * - speaker === 'client' (Agent speech NEVER eligible)
   * - isFinal === true
   * - substantive client turn (isSubstantiveClientTurn)
   * - turnId not yet analyzed
   * - revision not yet analyzed
   */
  public checkEligibility(
    turn: TranscriptTurn,
    revision: number
  ): { eligible: boolean; reason: string; canReuseLast: boolean } {
    let rejectionReason: string | null = null;

    if (turn.speaker !== 'client') {
      rejectionReason = 'Реплика Андрея (анализ отключен)';
    } else if (!turn.isFinal) {
      rejectionReason = 'Промежуточная транскрипция';
    } else if (!isSubstantiveClientTurn(turn.text)) {
      rejectionReason = 'Бессодержательная реплика / междометие';
    } else if (this.analyzedTurnIds.has(turn.id)) {
      rejectionReason = 'Реплика уже проанализирована';
    } else if (this.analyzedRevisions.has(revision)) {
      rejectionReason = 'Ревизия уже обработана';
    }

    if (rejectionReason) {
      this.rejectedRequestsCount++;
      this.lastRejectedReason = rejectionReason;
      return { eligible: false, reason: rejectionReason, canReuseLast: true };
    }

    return {
      eligible: true,
      reason: `Финальная содержательная реплика клиента (${turn.text.trim().slice(0, 30)}...)`,
      canReuseLast: false,
    };
  }

  /**
   * Schedule analysis with debounce after final substantive client turn.
   * Aborts previous running request ONLY if a new substantive client turn arrives.
   * Never queues requests.
   */
  public scheduleAnalysis(
    payload: AnalysisPayload,
    onSuccess: (result: AnalysisResponse) => void,
    onError: (err: any) => void,
    onRefiningChange?: (isRefining: boolean) => void,
    debounceMs: number = 250
  ) {
    // Session isolation check
    if (this.currentSessionId && payload.sessionId !== this.currentSessionId) {
      this.cancelPending();
      this.currentSessionId = payload.sessionId;
    } else if (!this.currentSessionId) {
      this.currentSessionId = payload.sessionId;
    }

    // Abort previous in-flight request only because a new client turn has superseded it
    if (this.activeAbortController && this.inFlightRevision !== null) {
      try {
        this.activeAbortController.abort();
        this.cancelledRequestsCount++;
      } catch (e) {
        // ignore
      }
      this.activeAbortController = null;
      this.inFlightRevision = null;
    }

    this.pendingPayload = payload;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.executeAnalysis(onSuccess, onError, onRefiningChange);
    }, debounceMs);
  }

  private async executeAnalysis(
    onSuccess: (result: AnalysisResponse) => void,
    onError: (err: any) => void,
    onRefiningChange?: (isRefining: boolean) => void
  ) {
    if (!this.pendingPayload) return;

    const payload = this.pendingPayload;
    this.pendingPayload = null;

    const targetTurn = payload.newTurns?.[0];
    if (targetTurn) {
      const check = this.checkEligibility(targetTurn, payload.revision);
      if (!check.eligible) {
        console.log(`[AnalysisProvider] Пропуск запроса: ${check.reason}`);
        if (check.canReuseLast && this.lastValidResponse) {
          onSuccess(this.lastValidResponse);
        }
        return;
      }
    }

    this.inFlightRevision = payload.revision;

    // Update timestamps and reason
    this.lastAnalysisTimestamp = Date.now();
    this.lastRequestTimestamp = this.lastAnalysisTimestamp;
    this.lastRequestReason =
      payload.reason || (targetTurn ? `Клиент: "${targetTurn.text.slice(0, 35)}..."` : 'Анализ контекста');
    this.totalAnalysisRequestsCount++;

    // Create abort controller for this specific request
    this.activeAbortController = new AbortController();
    const currentSignal = this.activeAbortController.signal;
    const reqSessionId = payload.sessionId;
    const reqRevision = payload.revision;

    // Soft threshold: after 1200ms show "Уточняю контекст..." without aborting
    this.softThresholdTimer = setTimeout(() => {
      onRefiningChange?.(true);
    }, 1200);

    // Hard network timeout: 4500ms safety limit
    let isHardTimedOut = false;
    this.hardTimeoutTimer = setTimeout(() => {
      isHardTimedOut = true;
      if (this.activeAbortController) {
        try {
          this.activeAbortController.abort();
          this.cancelledRequestsCount++;
        } catch (e) {
          // ignore
        }
      }
    }, 4500);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: currentSignal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const data: AnalysisResponse = await response.json();

      // Discard stale response if session changed or superseded by newer revision
      if (data.sessionId !== this.currentSessionId || data.sessionId !== reqSessionId) {
        console.warn(`[AnalysisProvider] Discarded stale response for session ${data.sessionId}`);
        return;
      }

      if (data.basedOnRevision < this.latestAcknowledgedRevision) {
        console.warn(`[AnalysisProvider] Discarded outdated revision ${data.basedOnRevision}`);
        return;
      }

      // MARK AS ANALYZED ONLY ON SUCCESSFUL RESPONSE (HTTP 2xx)
      if (targetTurn?.id) {
        this.analyzedTurnIds.add(targetTurn.id);
      }
      this.analyzedRevisions.add(payload.revision);

      this.latestAcknowledgedRevision = data.basedOnRevision;
      this.lastValidResponse = data;
      onRefiningChange?.(false);
      onSuccess(data);
    } catch (err: any) {
      onRefiningChange?.(false);
      if (err.name === 'AbortError') {
        if (isHardTimedOut) {
          console.warn(
            `[AnalysisProvider] Analysis hard timed out at 4500ms for rev ${reqRevision}. Preserving current suggestion.`
          );
          onError({ isTimeout: true, message: 'Время ответа Gemini превышено, карточка сохранена' });
        }
        return;
      }
      console.error('Analysis execution failed:', err);
      onError(err);
    } finally {
      if (this.softThresholdTimer) {
        clearTimeout(this.softThresholdTimer);
        this.softThresholdTimer = null;
      }
      if (this.hardTimeoutTimer) {
        clearTimeout(this.hardTimeoutTimer);
        this.hardTimeoutTimer = null;
      }
      this.inFlightRevision = null;
      this.activeAbortController = null;
    }
  }

  public cancelPending() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.softThresholdTimer) {
      clearTimeout(this.softThresholdTimer);
      this.softThresholdTimer = null;
    }
    if (this.hardTimeoutTimer) {
      clearTimeout(this.hardTimeoutTimer);
      this.hardTimeoutTimer = null;
    }
    if (this.activeAbortController) {
      try {
        this.activeAbortController.abort();
        this.cancelledRequestsCount++;
      } catch (e) {
        // ignore
      }
      this.activeAbortController = null;
    }
    this.pendingPayload = null;
    this.inFlightRevision = null;
  }
}
