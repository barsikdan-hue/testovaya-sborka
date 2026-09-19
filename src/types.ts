export type ConversationMode = 'live_call' | 'test_dialogue' | 'technical_discussion';

export type SpeakerRole = 'agent' | 'client' | 'unknown';
export type AudioSourceType = 'microphone' | 'call_audio' | 'unknown';

export type CallStage =
  | 'contact'
  | 'diagnostics'
  | 'objection_clarification'
  | 'next_step_agreement';

export type DealStage =
  | 'new_contact'
  | 'qualification'
  | 'meeting'
  | 'scenario_selection'
  | 'specific_objects'
  | 'negotiations'
  | 'closing'
  | 'completed';

export type ConversationTask =
  | 'understand_motive'
  | 'clarify_criterion'
  | 'discuss_price'
  | 'compare_options'
  | 'resolve_layout'
  | 'check_documents'
  | 'agree_action';

export type ActionType =
  | 'ANSWER'
  | 'CLARIFY'
  | 'DEEPEN'
  | 'SUMMARIZE'
  | 'SHOW_EVIDENCE'
  | 'PROPOSE_NEXT_STEP'
  | 'WAIT'
  | 'RESPECT_STOP'
  | 'OBJECTION_CLARIFICATION'
  | 'NEXT_STEP';

export type SuggestionFeedback = 'useful' | 'irrelevant' | 'already_discussed';

export interface NextStepAgreement {
  action: string;
  assignee?: string;
  timeOrDeadline?: string;
  basisTurnId?: string;
  status: 'proposed' | 'discussing' | 'agreed' | 'done' | 'none';
}

export interface TranscriptTurn {
  id: string;
  sessionId: string;
  source: AudioSourceType;
  speaker: SpeakerRole;
  text: string;
  interimText?: string;
  timestamp: number;
  isFinal: boolean;
  revision?: number;
  audioOffset?: string;
}

export interface ConfirmedFact {
  id: string;
  category: string;
  value: string;
  evidenceQuote: string;
  turnId: string;
  confidence: number;
  status?: MetricStatus;
  semanticReason?: string;
  needsClarification?: boolean;
  isFlexible?: boolean;
  comment?: string;
  timestamp?: number;
}

export type MetricStatus =
  | 'confirmed'
  | 'partially_confirmed'
  | 'needs_clarification'
  | 'not_confirmed'
  | 'missing'
  | 'not_applicable';

export interface FirstCallMetric {
  id: string;
  field?: string;
  name: string;
  category: 'trust' | 'needs' | 'finances' | 'qualification' | 'conversion';
  status: MetricStatus;
  value?: string | null;
  evidenceQuote?: string | null;
  evidenceTurnId?: string | null;
  semanticReason?: string | null;
  confidence?: number;
  needsClarification?: boolean;
  comment?: string | null;
  details?: Record<string, any>;
  isCoreCriteria?: boolean; // Part of the 12 quality criteria
  priorityOrder?: number;
  agentQuestionAsked?: boolean;
  agentQuestionQuote?: string | null;
}

export interface TrustEvaluation {
  status: MetricStatus;
  openTechnicalQuestionsCount: number;
  openPersonalQuestionsCount: number;
  technicalQuestions: string[];
  personalQuestions: string[];
  clientSubstantiveTurns: number;
  agentSpeechRatio: number;
  clientSpeechRatio: number;
  ratioRulePassed: boolean;
  nonInterrogationPassed: boolean;
  score: number;
}

export interface PpiEvaluation {
  status: MetricStatus;
  budgetOrExperienceDisclosed: boolean;
  paymentMethodDisclosed: boolean;
  explainedOpportunities: string[];
  specialistOffered: boolean;
  rejectionHandled?: boolean;
}

export interface PpvEvaluation {
  status: MetricStatus;
  tiedToClientNeed: boolean;
  valueExplained: boolean;
  developerSpecialistConnected: boolean;
  concreteTimeProposed: boolean;
  concreteTimeValue?: string | null;
  clientAgreed: boolean;
  minuteProposed?: number;
}

export interface QualityControlResult {
  isQualityCall: boolean;
  passedCoreCriteriaCount: number;
  totalCoreCriteria: number;
  mandatoryTrustPassed: boolean;
  mandatoryPpvPassed: boolean;
  verdict: 'QUALITY' | 'NEEDS_WORK';
  verdictReason: string;
  immediatePriorityMetric: string;
  immediatePriorityHint: string;
  nextScriptStep: string;
}

export interface FirstCallScriptProgress {
  routeStage:
    | 'greeting'
    | 'setup'
    | 'client_research'
    | 'spin'
    | 'financial_qualification'
    | 'lpr_check'
    | 'objections'
    | 'ppi'
    | 'ppv'
    | 'next_step';
  metrics: Record<string, FirstCallMetric>;
  trust: TrustEvaluation;
  ppi: PpiEvaluation;
  ppv: PpvEvaluation;
  quality: QualityControlResult;
  purchaseDependency?: string | null;
}

export interface FactEntry {
  value: string | null;
  category?: string;
  evidenceQuote?: string | null;
  turnId?: string;
  confidence?: number;
  evidenceTurnIds: string[];
  needsClarification?: boolean;
  semanticReason?: string | null;
  status?: MetricStatus;
  comment?: string;
  isFlexible?: boolean;
}

export interface CriterionItem {
  text: string;
  evidenceTurnId: string;
  evidenceQuote?: string;
  confidence?: number;
}

export type AgentActionType =
  | 'asked_situation_question'
  | 'asked_problem_question'
  | 'asked_implication_question'
  | 'asked_need_payoff_question'
  | 'asked_qualification_question'
  | 'presented_object'
  | 'handled_objection'
  | 'summarized'
  | 'asked_next_step'
  | 'none';

export type SuggestionMode =
  | 'WAIT'
  | 'SPIN_SITUATION'
  | 'SPIN_PROBLEM'
  | 'SPIN_IMPLICATION'
  | 'SPIN_NEED_PAYOFF'
  | 'OBJECTION_CLARIFICATION'
  | 'HPB_PRESENTATION'
  | 'CHECK_ALIGNMENT'
  | 'NEXT_STEP';

export type SpinStageType = 'SITUATION' | 'PROBLEM' | 'IMPLICATION' | 'NEED_PAYOFF';

export interface SpinItem {
  text: string;
  evidenceQuote: string;
  evidenceTurnId: string;
  source: 'client';
  confidence: number;
}

export interface SpinState {
  situation: SpinItem[];
  problem: SpinItem[];
  implication: SpinItem[];
  needPayoff: SpinItem[];
  currentStage: SpinStageType;
  completedStages: SpinStageType[];
  missingStage: string;
  lastClientEvidence: string;
  confidence: number;
}

export interface HpbLink {
  clientNeed: string;
  evidenceQuote: string;
  characteristic: string;
  advantage: string;
  benefit: string;
}

export interface UnconfirmedHypothesis {
  category: string;
  text: string;
  reason: string;
}

export interface ConversationState {
  stage: CallStage;
  dealStage?: DealStage;
  conversationTask?: ConversationTask;
  revision: number;
  goal: FactEntry;
  location: FactEntry;
  budget: FactEntry;
  paymentMethod: FactEntry;
  purchaseTimeline: FactEntry;
  moveInTimeline: FactEntry;
  possibleExitHorizon: FactEntry;
  timeline?: FactEntry;
  decisionMakers: FactEntry;
  criteria: {
    value: string | null;
    items: CriterionItem[];
    evidenceTurnIds: string[];
  };
  concerns: {
    value: string | null;
    items: string[];
    evidenceTurnIds: string[];
  };
  objections: {
    value: string | null;
    items: string[];
    evidenceTurnIds: string[];
  };
  confirmedFacts: ConfirmedFact[];
  spin: SpinState;
  hpbPresentation?: HpbLink | null;
  lastAgentAction?: AgentActionType;
  suggestionMode?: SuggestionMode;
  unconfirmedHypotheses: UnconfirmedHypothesis[];
  askedQuestions: string[];
  agreedNextStep: FactEntry;
  nextStepAgreement?: NextStepAgreement;
  scriptProgress?: FirstCallScriptProgress;
  trustEvaluation?: TrustEvaluation;
  qualityResult?: QualityControlResult;
  purchaseDependency?: string | null;
  downPaymentSource?: FactEntry;
  familyMortgage?: FactEntry;
  propertyType?: FactEntry;
  infrastructure?: FactEntry;
  searchExperience?: FactEntry;
  urgency?: FactEntry;
  employment?: FactEntry;
  ppi?: FactEntry;
  ppv?: FactEntry;
}

export interface SalesRule {
  id: string;
  title: string;
  version?: string;
  origin?: string;
  status: 'draft' | 'active';
  applicability: string;
  exclusions: string;
  priority: number;
  actionType?: ActionType;
  objective: string;
  suggestedQuestions: string[];
  completionCriteria?: string;
  antiRepetitionRule?: string;
  cooldown: number;
  requiredContext: string[];
}

export interface SuggestionLockState {
  suggestionLocked: boolean;
  lockedSuggestionId: string | null;
  lockedAt: number | null;
  lastClientRevision: number;
}

export interface SuggestedReply {
  id: string;
  sessionId: string;
  basedOnRevision: number;
  candidateRuleId: string | null;
  selectedRuleId?: string | null;
  actionType?: ActionType;
  suggestionMode?: SuggestionMode;
  hpb?: HpbLink | null;
  expectedClientMeaning?: string | null;
  recognizedMeaning?: string | null;
  evidenceQuote?: string | null;
  dealStage?: DealStage;
  conversationTask?: ConversationTask;
  clientIntent?: string;
  text: string;
  shortReason: string;
  evidenceTurnIds: string[];
  createdAt: number;
  stage: CallStage;
  confidenceStatus?: 'confirmed' | 'high' | 'provisional' | 'wait';
  isLocked?: boolean;
  feedback?: SuggestionFeedback;
  closesMetric?: string | null;
  closesMetricLabel?: string | null;
  immediatePriority?: string | null;
}

export interface AnalysisResponse {
  sessionId: string;
  basedOnRevision: number;
  stage: CallStage;
  dealStage?: DealStage;
  conversationTask?: ConversationTask;
  clientIntent?: string;
  actionType?: ActionType;
  suggestionMode?: SuggestionMode;
  agentAction?: AgentActionType;
  selectedRuleId?: string | null;
  closesMetric?: string | null;
  closesMetricLabel?: string | null;
  immediatePriority?: string | null;
  scriptProgress?: FirstCallScriptProgress;
  qualityResult?: QualityControlResult;
  recognizedMeaning?: string | null;
  factsDelta: Array<{
    category?: string;
    field: string;
    status?: MetricStatus;
    value: string;
    evidenceQuote: string;
    evidenceTurnId: string;
    semanticReason?: string;
    confidence?: number;
    needsClarification?: boolean;
    isFlexible?: boolean;
    comment?: string;
  }>;
  activeConcern?: string | null;
  objection: string | null;
  candidateRuleId: string | null;
  suggestedReply: string | null;
  shortReason: string | null;
  expectedClientMeaning?: string | null;
  hpb?: HpbLink | null;
  evidenceTurnIds: string[];
  missingCriticalField: string | null;
  nextStep?: NextStepAgreement;
  shouldSuggest: boolean;
  spinDelta?: {
    situation?: Array<SpinItem | string>;
    problem?: Array<SpinItem | string>;
    implication?: Array<SpinItem | string>;
    needPayoff?: Array<SpinItem | string>;
    currentStage?: SpinStageType;
    completedStages?: SpinStageType[];
    missingStage?: string;
    lastClientEvidence?: string;
    confidence?: number;
  };
  unconfirmedHypotheses?: Array<{
    category: string;
    text: string;
    reason: string;
  }>;
  latencyMs?: number;
  modelUsed?: string;
}

export interface CallSummary {
  clientGoal: string;
  confirmedFacts: Array<{
    category: string;
    label: string;
    value: string;
    evidenceQuote: string;
    turnId: string;
    confidence: number;
    quote?: string;
  }>;
  problems?: string[];
  implications?: string[];
  criteria?: string[];
  objections: string[];
  agreedNextStep: string;
  unconfirmedData?: any[];
  unconfirmedHypotheses?: Array<{
    category: string;
    text: string;
    reason: string;
  }>;
  openQuestions?: string[];
  recommendations?: string[];
  strongPoint?: string;
  specificImprovement?: string;
  spin?: {
    situation: string[];
    problem: string[];
    implication: string[];
    needPayoff: string[];
  };
  qualityResult?: QualityControlResult;
  firstCallMetrics?: Record<string, FirstCallMetric>;
  trustEvaluation?: TrustEvaluation;
  ppiEvaluation?: PpiEvaluation;
  ppvEvaluation?: PpvEvaluation;
  durationSeconds: number;
  completedAt: number;
}

export interface CallSessionRecord {
  id: string;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  turns: TranscriptTurn[];
  state: ConversationState;
  summary?: CallSummary;
  suggestedRepliesHistory: SuggestedReply[];
  status: 'completed' | 'cancelled';
  note?: string;
}

export interface DiagnosticsData {
  microphoneConnected: boolean;
  callAudioConnected: boolean;
  sttAgentStatus: 'idle' | 'connecting' | 'connected' | 'error' | 'closed';
  sttClientStatus: 'idle' | 'connecting' | 'connected' | 'error' | 'closed';
  actualModel: string;
  analysisModel: string;
  lastReceivedTextTime: number | null;
  lastAnalysisTime: number | null;
  reconnectCount: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  analysisRequestsCount: number;
  analysisLatencyMs: number | null;
  liveSttSessionsCount: number;
  cancelledRequestsCount: number;
  lastRequestTime: number | null;
  lastRequestReason: string | null;
}
