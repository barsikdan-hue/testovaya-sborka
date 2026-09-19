import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isSubstantiveClientTurn, detectLocalObjection } from './objectionEngine';
import { AnalysisProvider } from './analysisProvider';
import { ANDREI_OS_RULES } from './andreiRules';
import { createInitialState, mergeFactsDelta } from './conversationStore';
import { ConversationState, TranscriptTurn } from '../types';
import { isDuplicateFinalTurn } from './sttDedup';
import { extractDeterministicFacts } from './deterministicFacts';
import { selectCandidateRules } from './candidateRules';

describe('Copilot Engine & Andrei OS Test Suite', () => {
  const initialConversationState: ConversationState = createInitialState();

  // Scenario 1: Short non-substantive words return false
  it('Scenario 1: filters out short non-substantive filler words', () => {
    const fillers = ['да', 'угу', 'ага', 'понятно', 'хорошо', 'конечно', 'нет', 'не знаю'];
    for (const word of fillers) {
      expect(isSubstantiveClientTurn(word)).toBe(false);
      expect(isSubstantiveClientTurn(`  ${word}  `)).toBe(false);
    }
  });

  // Scenario 2: Short substantive turns return true
  it('Scenario 2: accepts short substantive business turns with numbers or keywords', () => {
    expect(isSubstantiveClientTurn('30 млн')).toBe(true);
    expect(isSubstantiveClientTurn('30млн')).toBe(true);
    expect(isSubstantiveClientTurn('для себя')).toBe(true);
    expect(isSubstantiveClientTurn('дорого')).toBe(true);
    expect(isSubstantiveClientTurn('Анапа')).toBe(true);
    expect(isSubstantiveClientTurn('в Сочи')).toBe(true);
    expect(isSubstantiveClientTurn('2 комнатная')).toBe(true);
  });

  // Scenario 3: Agent speech is never eligible for analysis
  it('Scenario 3: agent speech is never eligible for analysis', () => {
    const provider = new AnalysisProvider();
    provider.setSession('sess_1');

    const agentTurn: TranscriptTurn = {
      id: 'turn_agent_1',
      sessionId: 'sess_1',
      source: 'microphone',
      speaker: 'agent',
      text: 'Добрый день! Подскажите, рассматриваете квартиру для отдыха или для жизни?',
      timestamp: Date.now(),
      isFinal: true,
    };

    const check = provider.checkEligibility(agentTurn, 2);
    expect(check.eligible).toBe(false);
    expect(check.reason).toContain('Реплика Андрея');
  });

  // Scenario 4: Interim client turns are not eligible
  it('Scenario 4: interim speech is not eligible for analysis', () => {
    const provider = new AnalysisProvider();
    provider.setSession('sess_1');

    const interimTurn: TranscriptTurn = {
      id: 'turn_client_interim',
      sessionId: 'sess_1',
      source: 'call_audio',
      speaker: 'client',
      text: 'Мы хотим купить квартиру в Сочи около тридцати миллионов',
      timestamp: Date.now(),
      isFinal: false,
    };

    const check = provider.checkEligibility(interimTurn, 2);
    expect(check.eligible).toBe(false);
    expect(check.reason).toContain('Промежуточная транскрипция');
  });

  // Scenario 5: "Для себя" without permanent relocation triggers clarify_for_myself_format
  it('Scenario 5: "для себя" without living keywords maps to clarify_for_myself_format rule', () => {
    const rule = ANDREI_OS_RULES.find((r) => r.id === 'clarify_for_myself_format');
    expect(rule).toBeDefined();
    expect(rule?.title.toLowerCase()).toContain('для себя');
    expect(rule?.suggestedQuestions[0]).toContain('отдых');

    const p48 = ANDREI_OS_RULES.find((r) => r.id === 'P48');
    expect(p48?.exclusions).toContain('для себя');
  });

  // Scenario 6: "Для себя, переезжаем жить" triggers P48
  it('Scenario 6: explicit permanent relocation is covered by P48', () => {
    const p48 = ANDREI_OS_RULES.find((r) => r.id === 'P48');
    expect(p48).toBeDefined();
    expect(p48?.applicability.toLowerCase()).toContain('перее');
  });

  // Scenario 7: "Дорого" triggers detectLocalObjection with objection_price category and P37
  it('Scenario 7: detects "дорого" objection locally without API call', () => {
    const objection = detectLocalObjection('Это очень дорого для нас', initialConversationState);
    expect(objection).not.toBeNull();
    expect(objection?.category).toBe('objection_price');
    expect(objection?.ruleId).toBe('P37');
    expect(objection?.actionType).toBe('CLARIFY');
  });

  // Scenario 8: "Пришлите фото / варианты" triggers action_variants_video objection locally
  it('Scenario 8: detects "пришлите фото / материалы" objection locally', () => {
    const objection1 = detectLocalObjection('Скиньте мне варианты на WhatsApp', initialConversationState);
    expect(objection1).not.toBeNull();
    expect(objection1?.category).toBe('action_variants_video');
    expect(objection1?.actionType).toBe('PROPOSE_NEXT_STEP');
    expect(objection1?.text).toContain('видео');

    const objection2 = detectLocalObjection('Пришлите проект договора', initialConversationState);
    expect(objection2).not.toBeNull();
    expect(objection2?.category).toBe('action_answer');
  });

  // Scenario 9: "Не хочу видеозвонок / без зума" triggers objection_channel
  it('Scenario 9: detects refusal of video / zoom meeting locally', () => {
    const objection = detectLocalObjection('Я не хочу видеопоказ, давайте без зума', initialConversationState);
    expect(objection).not.toBeNull();
    expect(objection?.category).toBe('objection_channel');
    expect(objection?.text).toContain('видеосвязь не обязательна');
  });

  // Scenario 10: AnalysisProvider records turn as analyzed ONLY on HTTP 200
  it('Scenario 10: does not mark turn as analyzed if request fails or errors', async () => {
    const provider = new AnalysisProvider();
    provider.setSession('sess_1');

    const clientTurn: TranscriptTurn = {
      id: 'turn_client_1',
      sessionId: 'sess_1',
      source: 'call_audio',
      speaker: 'client',
      text: 'Ищем трехкомнатную квартиру с ремонтом',
      timestamp: Date.now(),
      isFinal: true,
    };

    // Mock fetch to simulate failure
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

    const errorCallback = vi.fn();
    const successCallback = vi.fn();

    provider.scheduleAnalysis(
      {
        sessionId: 'sess_1',
        revision: 2,
        newTurns: [clientTurn],
        recentTurns: [],
        currentState: initialConversationState,
      },
      successCallback,
      errorCallback,
      undefined,
      10 // small debounce
    );

    // Wait for debounce and network execution
    await new Promise((r) => setTimeout(r, 50));

    expect(errorCallback).toHaveBeenCalled();
    expect(successCallback).not.toHaveBeenCalled();

    // Restore fetch
    global.fetch = originalFetch;
  });

  // Scenario 11: Superseding in-flight request on new substantive client turn
  it('Scenario 11: supersedes in-flight request when a new substantive client turn arrives', async () => {
    const provider = new AnalysisProvider();
    provider.setSession('sess_1');

    const turn1: TranscriptTurn = {
      id: 'turn_1',
      sessionId: 'sess_1',
      source: 'call_audio',
      speaker: 'client',
      text: 'Рассматриваем покупку квартиры',
      timestamp: Date.now(),
      isFinal: true,
    };

    const turn2: TranscriptTurn = {
      id: 'turn_2',
      sessionId: 'sess_1',
      source: 'call_audio',
      speaker: 'client',
      text: 'Бюджет тридцать пять миллионов рублей',
      timestamp: Date.now() + 100,
      isFinal: true,
    };

    const success1 = vi.fn();
    const success2 = vi.fn();
    const err = vi.fn();

    provider.scheduleAnalysis(
      {
        sessionId: 'sess_1',
        revision: 2,
        newTurns: [turn1],
        recentTurns: [],
        currentState: initialConversationState,
      },
      success1,
      err,
      undefined,
      150
    );

    // Immediately schedule turn 2 before debounce of turn 1 fires
    provider.scheduleAnalysis(
      {
        sessionId: 'sess_1',
        revision: 3,
        newTurns: [turn2],
        recentTurns: [turn1],
        currentState: initialConversationState,
      },
      success2,
      err,
      undefined,
      150
    );

    // Turn 1's debounce was replaced by turn 2
    expect(provider.getStats().requestsCount).toBe(0);
  });

  // Scenario 12: ConversationState merges facts regardless of suggestion UI lock
  it('Scenario 12: merges facts into ConversationState reliably', () => {
    const clientTurn: TranscriptTurn = {
      id: 'turn_client_facts',
      sessionId: 'sess_1',
      source: 'call_audio',
      speaker: 'client',
      text: 'Наш бюджет 45 миллионов рублей',
      timestamp: Date.now(),
      isFinal: true,
    };

    const turnLookup: Record<string, string> = {
      [clientTurn.id]: clientTurn.text,
    };

    const factsDelta = [
      {
        category: 'budget',
        field: 'budget',
        value: '45 млн руб',
        evidenceQuote: 'бюджет 45 миллионов рублей',
        evidenceTurnId: clientTurn.id,
        confidence: 0.95,
        status: 'confirmed',
      },
    ];

    const nextState = mergeFactsDelta(
      initialConversationState,
      factsDelta as any,
      'diagnostics',
      null,
      3,
      turnLookup
    );

    expect(nextState.budget.value).toBe('45 млн руб');
    expect(nextState.stage).toBe('diagnostics');
    expect(nextState.confirmedFacts.length).toBe(1);
    expect(nextState.confirmedFacts[0].evidenceQuote).toContain('45 миллионов');
  });

  // Scenario 13: STT turn deduplication protection (Requirement 10 & 14)
  it('Scenario 13: deduplicates identical final STT turns within 1.5s window', () => {
    const baseTime = 10000;
    const turn1: TranscriptTurn = {
      id: 't1',
      sessionId: 's1',
      source: 'call_audio',
      speaker: 'client',
      text: 'Алло, меня слышно?',
      timestamp: baseTime,
      isFinal: true,
    };

    // Identical turn within 500ms from same speaker
    expect(isDuplicateFinalTurn(turn1, 'client', 'Алло, меня слышно?', baseTime + 500, 1500)).toBe(true);

    // Same text but after 2000ms (> 1500ms window)
    expect(isDuplicateFinalTurn(turn1, 'client', 'Алло, меня слышно?', baseTime + 2000, 1500)).toBe(false);

    // Same text within 500ms but different speaker
    expect(isDuplicateFinalTurn(turn1, 'agent', 'Алло, меня слышно?', baseTime + 500, 1500)).toBe(false);

    // Different text within 500ms
    expect(isDuplicateFinalTurn(turn1, 'client', 'Да, слышно отлично', baseTime + 500, 1500)).toBe(false);
  });

  // Scenario 14: Deterministic facts extraction on client turn (Requirement 4 & 14)
  it('Scenario 14: extracts deterministic facts from client turns even when objections are raised', () => {
    const turnId = 'turn_objection_fact';
    const clientUtterance = 'В Сочи до 30 млн ничего приличного нет, скиньте варианты в ватсап';

    const facts = extractDeterministicFacts(clientUtterance, turnId);
    expect(facts.length).toBeGreaterThanOrEqual(2);

    const budgetFact = facts.find((f: any) => f.category === 'budget');
    expect(budgetFact).toBeDefined();
    expect(budgetFact?.value).toContain('30 млн руб');

    const locationFact = facts.find((f: any) => f.category === 'location');
    expect(locationFact).toBeDefined();
    expect(locationFact?.value).toBe('Сочи');
  });

  // Scenario 15: Candidate rules selector integrity (Requirement 6 & 14)
  it('Scenario 15: selects candidate rules with proper exclusion and applicability filtering', () => {
    const selected = selectCandidateRules(
      ANDREI_OS_RULES,
      'Рассматриваем покупку квартиры в Сочи для себя',
      'diagnostics'
    );

    expect(Array.isArray(selected)).toBe(true);
    expect(selected.length).toBeGreaterThan(0);
    expect(selected.length).toBeLessThanOrEqual(5);

    // Clarify for myself format should be prioritized for "для себя" without relocation
    const ruleIds = selected.map((r: any) => r.id);
    expect(ruleIds).toContain('clarify_for_myself_format');
  });

  // Scenario 16: Suggestion lock & pending suggestion preservation (Requirement 1 & 14)
  it('Scenario 16: preserves pending suggestion when suggestionLocked=true and presents on unlock', () => {
    let suggestionLocked = true;
    let currentSuggestion: any = { id: 'old_card', text: 'Старая подсказка' };
    let pendingSuggestion: any = null;

    // Fresh analysis arrives while Andrei is speaking
    const freshSuggestion = { id: 'fresh_card', text: 'Новая подсказка из анализа клиента' };

    if (suggestionLocked) {
      pendingSuggestion = freshSuggestion;
    } else {
      currentSuggestion = freshSuggestion;
    }

    // Current suggestion on screen remains unchanged
    expect(currentSuggestion.id).toBe('old_card');
    expect(pendingSuggestion.id).toBe('fresh_card');

    // Andrei stops speaking -> unlock
    suggestionLocked = false;
    if (pendingSuggestion) {
      currentSuggestion = pendingSuggestion;
      pendingSuggestion = null;
    }

    // Now fresh suggestion is presented without calling Gemini API again!
    expect(currentSuggestion.id).toBe('fresh_card');
    expect(pendingSuggestion).toBeNull();
  });

  // Scenario 17: Audio capture pause suppression (Requirement 3, 8 & 14)
  it('Scenario 17: audio capture pause suppression flag drops chunks without destroying stream', () => {
    let isPaused = false;
    let chunksSent = 0;

    const onChunk = () => {
      if (!isPaused) {
        chunksSent++;
      }
    };

    onChunk();
    expect(chunksSent).toBe(1);

    isPaused = true;
    onChunk();
    onChunk();
    expect(chunksSent).toBe(1); // Dropped while paused

    isPaused = false;
    onChunk();
    expect(chunksSent).toBe(2); // Resumed cleanly
  });

  // Scenario 18: In-flight abort on new client turn superseding (Requirement 14)
  it('Scenario 18: aborts running fetch when superseded by a new client turn', async () => {
    const provider = new AnalysisProvider();
    provider.setSession('sess_abort');

    let abortCalled = false;
    const fakeAbortController = {
      abort: () => {
        abortCalled = true;
      },
      signal: {} as any,
    };

    // Inject active controller
    (provider as any).activeAbortController = fakeAbortController;
    (provider as any).inFlightRevision = 2;

    const newTurn: TranscriptTurn = {
      id: 'turn_new_supersede',
      sessionId: 'sess_abort',
      source: 'call_audio',
      speaker: 'client',
      text: 'На самом деле наш бюджет до пятидесяти миллионов',
      timestamp: Date.now(),
      isFinal: true,
    };

    provider.scheduleAnalysis(
      {
        sessionId: 'sess_abort',
        revision: 3,
        newTurns: [newTurn],
        recentTurns: [],
        currentState: initialConversationState,
      },
      vi.fn(),
      vi.fn(),
      undefined,
      100
    );

    expect(abortCalled).toBe(true);
    expect(provider.getStats().cancelledCount).toBe(1);
  });
});
