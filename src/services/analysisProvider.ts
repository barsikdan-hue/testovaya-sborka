import {
  AnalysisResponse,
  ConversationState,
  TranscriptTurn,
} from '../types';

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
  private requestTimeoutTimer: any = null;

  // Quota optimization state & protections
  private analyzedTurnIds: Set<string> = new Set();
  private analyzedRevisions: Set<number> = new Set();
  private lastAnalysisTimestamp: number = 0;
  private lastValidResponse: AnalysisResponse | null = null;

  // Diagnostics counters
  private totalAnalysisRequestsCount: number = 0;
  private cancelledRequestsCount: number = 0;
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
      lastRequestTime: this.lastRequestTimestamp,
      lastRequestReason: this.lastRequestReason,
    };
  }

  public getLastValidResponse(): AnalysisResponse | null {
    return this.lastValidResponse;
  }

  /**
   * Requirements 4, 5, 6, 7, 12, 17, 18, 19, 20:
   * Verify all conditions before allowing an analysis request:
   * - speaker === 'client'
   * - isFinal === true
   * - text.length >= 12
   * - turnId not yet analyzed
   * - revision not yet analyzed
   * - at least 3 seconds passed since last analysis
   */
  public checkEligibility(
    turn: TranscriptTurn,
    revision: number
  ): { eligible: boolean; reason: string; canReuseLast: boolean } {
    if (turn.speaker !== 'client') {
      return { eligible: false, reason: 'Реплика Андрея (анализ отключен)', canReuseLast: true };
    }
    if (!turn.isFinal) {
      return { eligible: false, reason: 'Промежуточная транскрипция', canReuseLast: true };
    }
    if (turn.text.trim().length < 12) {
      return { eligible: false, reason: 'Короткая реплика (< 12 символов)', canReuseLast: true };
    }
    if (this.analyzedTurnIds.has(turn.id)) {
      return { eligible: false, reason: 'Реплика уже проанализирована', canReuseLast: true };
    }
    if (this.analyzedRevisions.has(revision)) {
      return { eligible: false, reason: 'Ревизия уже обработана', canReuseLast: true };
    }

    const elapsed = Date.now() - this.lastAnalysisTimestamp;
    if (elapsed < 3000) {
      return {
        eligible: false,
        reason: `Интервал < 3 сек (${Math.round(elapsed / 100) / 10}с), повторное использование`,
        canReuseLast: true,
      };
    }

    return {
      eligible: true,
      reason: `Финальная содержательная реплика клиента (${turn.text.trim().slice(0, 30)}...)`,
      canReuseLast: false,
    };
  }

  /**
   * Schedule analysis with 300 ms debounce only after final client turn (Requirement 11).
   * Aborts previous running request if a new substantive client turn arrives (Requirement 8).
   * Never queues requests (Requirement 9).
   */
  public scheduleAnalysis(
    payload: AnalysisPayload,
    onSuccess: (result: AnalysisResponse) => void,
    onError: (err: any) => void,
    onRefiningChange?: (isRefining: boolean) => void,
    debounceMs: number = 300
  ) {
    // Session isolation check
    if (this.currentSessionId && payload.sessionId !== this.currentSessionId) {
      this.cancelPending();
      this.currentSessionId = payload.sessionId;
    } else if (!this.currentSessionId) {
      this.currentSessionId = payload.sessionId;
    }

    // Requirement 8: If an old analysis request is in-flight, abort it immediately via AbortController
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

    // Requirement 9: Do NOT queue requests; replace pending payload
    this.pendingPayload = payload;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Requirement 11: Debounce 300 ms after final client turn
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
      // Final eligibility verification before network call (Requirement 19 & 20)
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

    // Track analyzed turn and revision to prevent duplicate requests (Requirement 17 & 18)
    if (targetTurn?.id) {
      this.analyzedTurnIds.add(targetTurn.id);
    }
    this.analyzedRevisions.add(payload.revision);

    // Update timestamps and reason
    this.lastAnalysisTimestamp = Date.now();
    this.lastRequestTimestamp = this.lastAnalysisTimestamp;
    this.lastRequestReason = payload.reason || (targetTurn ? `Клиент: "${targetTurn.text.slice(0, 35)}..."` : 'Анализ контекста');
    this.totalAnalysisRequestsCount++;

    // Create abort controller for this specific request
    this.activeAbortController = new AbortController();
    const currentSignal = this.activeAbortController.signal;
    const reqSessionId = payload.sessionId;
    const reqRevision = payload.revision;

    onRefiningChange?.(true);

    // Timeout: 1200ms
    let isTimedOut = false;
    this.requestTimeoutTimer = setTimeout(() => {
      isTimedOut = true;
      if (this.activeAbortController) {
        try {
          this.activeAbortController.abort();
          this.cancelledRequestsCount++;
        } catch (e) {
          // ignore
        }
      }
    }, 1200);

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

      this.latestAcknowledgedRevision = data.basedOnRevision;
      this.lastValidResponse = data;
      onRefiningChange?.(false);
      onSuccess(data);
    } catch (err: any) {
      onRefiningChange?.(false);
      if (err.name === 'AbortError') {
        if (isTimedOut) {
          console.warn(`[AnalysisProvider] Analysis timed out at 1200ms for rev ${reqRevision}. Preserving current suggestion.`);
          onError({ isTimeout: true, message: 'Уточняю контекст' });
        }
        return;
      }
      console.error('Analysis execution failed:', err);
      onError(err);
    } finally {
      if (this.requestTimeoutTimer) {
        clearTimeout(this.requestTimeoutTimer);
        this.requestTimeoutTimer = null;
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
    if (this.requestTimeoutTimer) {
      clearTimeout(this.requestTimeoutTimer);
      this.requestTimeoutTimer = null;
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
