/**
 * Semantic Anti-Repeat Guard for ANDREI OS Real Estate Copilot.
 * Ensures Copilot NEVER asks about facts that are already confirmed,
 * and NEVER repeats a question that has already been asked by the realtor
 * or suggested and used.
 */

import { ConversationState, SuggestedReply, TranscriptTurn } from '../types';
import { normalizeRussianText } from './textUtils';

export interface AntiRepeatCheckResult {
  accepted: boolean;
  semanticKey: string;
  rejectionReason?: string;
}

/**
 * Extracts a normalized semantic key representing the intent of a question or suggestion.
 */
export function extractSemanticKey(replyOrText: Partial<SuggestedReply> | string): string {
  if (typeof replyOrText !== 'string' && replyOrText.semanticKey) {
    return replyOrText.semanticKey;
  }

  const text = typeof replyOrText === 'string' ? replyOrText : replyOrText.text || '';
  const lower = text.toLowerCase();

  // 1. Goal / motive
  if (
    lower.includes('для чего выбираете') ||
    lower.includes('цель покупки') ||
    lower.includes('для себя или под сдачу') ||
    lower.includes('для себя или') ||
    lower.includes('рассматриваете для жизни')
  ) {
    return 'ask_goal';
  }
  if (lower.includes('для себя — это больше про отдых') || lower.includes('формат для себя')) {
    return 'clarify_for_myself';
  }

  // 2. Location
  if (
    lower.includes('какой район') ||
    lower.includes('какие районы') ||
    lower.includes('где именно в сочи') ||
    lower.includes('локация') ||
    lower.includes('ближе к морю или')
  ) {
    return 'ask_location';
  }

  // 3. Property Type
  if (
    lower.includes('квартира или дом') ||
    lower.includes('апартаменты или') ||
    lower.includes('тип недвижимости') ||
    lower.includes('какой формат жилья')
  ) {
    return 'ask_property_type';
  }

  // 4. Budget
  if (
    lower.includes('бюджет') ||
    lower.includes('по сумме') ||
    lower.includes('в какую сумму') ||
    lower.includes('до какой максимальной') ||
    lower.includes('предел по стоимости')
  ) {
    return 'ask_budget';
  }

  // 5. Payment Method & Financing
  if (
    lower.includes('способ покупки') ||
    lower.includes('форма оплаты') ||
    lower.includes('ипотека или рассрочка') ||
    lower.includes('собственные средства или')
  ) {
    return 'ask_payment_method';
  }
  if (
    lower.includes('первоначальный взнос') ||
    lower.includes('первый взнос') ||
    lower.includes('размер взноса')
  ) {
    return 'ask_down_payment';
  }
  if (
    lower.includes('продажа текущего') ||
    lower.includes('сначала продать') ||
    lower.includes('квартира уже выставлена')
  ) {
    return 'ask_down_payment_source';
  }
  if (
    lower.includes('семейная ипотека') ||
    lower.includes('дети до 6 лет') ||
    lower.includes('программа семейной')
  ) {
    return 'ask_family_mortgage';
  }

  // 6. Decision Makers (LPR)
  if (
    lower.includes('кто принимает решение') ||
    lower.includes('с кем советуетесь') ||
    lower.includes('совместно с кем') ||
    lower.includes('кто еще участвует') ||
    lower.includes('что для супруга будет')
  ) {
    return 'ask_decision_makers';
  }

  // 7. Timeline / Urgency
  if (
    lower.includes('когда планируете') ||
    lower.includes('в какие сроки') ||
    lower.includes('срочность') ||
    lower.includes('как скоро')
  ) {
    return 'ask_timeline';
  }

  // 8. Next Steps & PPV
  if (
    lower.includes('видеопоказ') ||
    lower.includes('видеопрезентац') ||
    lower.includes('по видео') ||
    lower.includes('подключим специалиста') ||
    lower.includes('выведем на экран')
  ) {
    return 'propose_video_presentation';
  }

  // 9. Objections & Clarifications
  if (lower.includes('дорого относительно')) {
    return 'clarify_objection_price';
  }
  if (lower.includes('над чем конкретно хотите подумать')) {
    return 'clarify_objection_think';
  }
  if (lower.includes('с чем связана пауза')) {
    return 'clarify_objection_not_now';
  }
  if (lower.includes('видеосвязь не обязательна') || lower.includes('камера с вашей стороны')) {
    return 'clarify_objection_no_video';
  }

  // 10. Fallback: normalized core phrase
  return 'custom_' + normalizeRussianText(text).slice(0, 30).replace(/\s+/g, '_');
}

/**
 * Checks if candidate reply repeats an already known fact or asked question.
 */
export function checkSemanticAntiRepeat(
  reply: SuggestedReply,
  state: ConversationState,
  recentTurns: TranscriptTurn[] = []
): AntiRepeatCheckResult {
  const key = reply.semanticKey || extractSemanticKey(reply);

  // 1. Check against ALREADY CONFIRMED facts in state
  if (key === 'ask_goal' && state.goal?.value && !state.goal.needsClarification) {
    return {
      accepted: false,
      semanticKey: key,
      rejectionReason: `Цель покупки уже подтверждена: "${state.goal.value}". Повторный вопрос запрещён.`,
    };
  }

  if (key === 'clarify_for_myself' && state.primaryGoal?.value) {
    return {
      accepted: false,
      semanticKey: key,
      rejectionReason: `Формат «для себя» уже раскрыт: "${state.primaryGoal.value}".`,
    };
  }

  if (key === 'ask_location' && state.location?.value && !state.location.needsClarification) {
    return {
      accepted: false,
      semanticKey: key,
      rejectionReason: `Локация уже подтверждена: "${state.location.value}".`,
    };
  }

  if (key === 'ask_budget' && state.budget?.value && !state.budget.needsClarification) {
    return {
      accepted: false,
      semanticKey: key,
      rejectionReason: `Бюджет уже подтвержден: "${state.budget.value}".`,
    };
  }

  if (key === 'ask_payment_method' && state.paymentMethod?.value && !state.paymentMethod.needsClarification) {
    return {
      accepted: false,
      semanticKey: key,
      rejectionReason: `Способ покупки уже подтвержден: "${state.paymentMethod.value}".`,
    };
  }

  if (key === 'ask_decision_makers' && state.decisionMakers?.value && !state.decisionMakers.needsClarification) {
    return {
      accepted: false,
      semanticKey: key,
      rejectionReason: `ЛПР уже подтвержден: "${state.decisionMakers.value}".`,
    };
  }

  if (key === 'ask_property_type' && state.propertyType?.value && !state.propertyType.needsClarification) {
    return {
      accepted: false,
      semanticKey: key,
      rejectionReason: `Тип недвижимости уже подтвержден: "${state.propertyType.value}".`,
    };
  }

  if (key === 'ask_timeline' && (state.purchaseTimeline?.value || state.timeline?.value)) {
    return {
      accepted: false,
      semanticKey: key,
      rejectionReason: `Сроки уже известны: "${state.purchaseTimeline?.value || state.timeline?.value}".`,
    };
  }

  // 2. Check against state.askedQuestions
  if (state.askedQuestions && state.askedQuestions.length > 0) {
    if (state.askedQuestions.includes(key)) {
      return {
        accepted: false,
        semanticKey: key,
        rejectionReason: `Вопрос по теме "${key}" уже задавался в диалоге.`,
      };
    }

    const normText = normalizeRussianText(reply.text);
    for (const asked of state.askedQuestions) {
      const normAsked = normalizeRussianText(asked);
      if (normAsked.length > 10 && normText.includes(normAsked.slice(0, 20))) {
        return {
          accepted: false,
          semanticKey: key,
          rejectionReason: `Похожая формулировка уже задавалась: "${asked.slice(0, 30)}..."`,
        };
      }
    }
  }

  // 3. Check against agent turns in transcript (what Andrei actually said)
  const agentTurns = recentTurns.filter((t) => t.speaker === 'agent');
  for (const turn of agentTurns.slice(-6)) {
    const turnKey = extractSemanticKey(turn.text);
    if (turnKey === key && key !== 'propose_video_presentation') {
      return {
        accepted: false,
        semanticKey: key,
        rejectionReason: `Риелтор уже задал этот вопрос в реплике: "${turn.text.slice(0, 40)}..."`,
      };
    }
  }

  return { accepted: true, semanticKey: key };
}
