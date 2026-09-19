import { ActionType, ConversationState, SuggestedReply } from '../types';

export interface FastObjectionResult {
  id: string;
  category: string;
  ruleId?: string;
  actionType: ActionType;
  text: string;
  shortReason: string;
  confidenceStatus: 'confirmed' | 'high' | 'provisional' | 'wait';
}

/**
 * Check whether a client turn is a substantive, meaningful utterance
 * (not a tiny filler / confirmation word like "угу", "да", "понял").
 */
export function isSubstantiveClientTurn(text: string): boolean {
  if (!text) return false;
  const clean = text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»]/g, '')
    .trim();

  if (!clean) return false;

  const fillers = new Set([
    'угу',
    'ага',
    'да',
    'нет',
    'понял',
    'поняла',
    'хорошо',
    'ясно',
    'так',
    'ладно',
    'ну да',
    'да да',
    'ага да',
    'ок',
    'окей',
    'понятно',
    'конечно',
    'не знаю',
    'не знаю пока',
    'да конечно',
    'ну конечно',
    'слушаю',
    'да слушаю',
    'алло',
    'да алло',
    'добрый день',
    'здравствуйте',
  ]);

  if (fillers.has(clean)) {
    return false;
  }

  const words = clean.split(/\s+/).filter(Boolean);

  // If 1 word only and not a key trigger word
  if (words.length === 1) {
    const significantSingleWords = ['дорого', 'подумаю', 'далеко', 'сочи', 'анапа', 'сириус', 'ипотека'];
    if (!significantSingleWords.some((w) => clean.includes(w))) {
      return false;
    }
  }

  // If 2 words and both are filler-like
  if (words.length === 2) {
    const fillerWords = ['ну', 'да', 'ага', 'угу', 'так', 'вот', 'понятно', 'хорошо', 'ясно', 'ладно'];
    if (words.every((w) => fillerWords.includes(w))) {
      return false;
    }
  }

  return true;
}

/**
 * Fast detection of 10 primary objections with the strict 6-step isolation algorithm:
 * 1. Acknowledge content without automatic agreement.
 * 2. Clarify what specifically lies behind objection.
 * 3. Isolate the reason.
 * 4. Ask ONE question.
 * 5. Do NOT defend the property / price immediately.
 */
export function detectLocalObjection(
  clientText: string,
  state?: ConversationState
): FastObjectionResult | null {
  const lower = clientText.toLowerCase();

  // 1. RESPECT_STOP: Стоп-контакт (Высший приоритет)
  if (
    lower.includes('больше не звоните') ||
    lower.includes('удалите мой номер') ||
    lower.includes('не звоните мне') ||
    lower.includes('не пишите мне') ||
    lower.includes('забудьте этот номер')
  ) {
    return {
      id: 'respect_stop',
      category: 'stop_contact',
      actionType: 'RESPECT_STOP',
      text: 'Понял вас. Зафиксировал ваш отказ, больше беспокоить не будем. Всего доброго.',
      shortReason: 'Стоп-контакт: вежливое завершение диалога, запрет продажи и уговоров.',
      confidenceStatus: 'confirmed',
    };
  }

  // 2. Уважение времени (за рулём, совещание)
  if (
    lower.includes('за рулем') ||
    lower.includes('за рулём') ||
    lower.includes('на совещании') ||
    lower.includes('не могу говорить') ||
    lower.includes('перезвоните')
  ) {
    return {
      id: 'respect_busy',
      category: 'busy_time',
      actionType: 'RESPECT_STOP',
      text: 'Понял, не отвлекаю. В какое время завтра будет удобно созвониться на пару минут?',
      shortReason: 'Клиент занят: фиксация времени перезвона без удержания на линии.',
      confidenceStatus: 'confirmed',
    };
  }

  // 3. P37: Дорого (изоляция причины, а не защита цены!)
  if (
    lower.includes('дорого') ||
    lower.includes('дороговато') ||
    lower.includes('цены космос') ||
    lower.includes('высокая цена') ||
    lower.includes('слишком дорого') ||
    lower.includes('завышен')
  ) {
    // If client named specific numbers (e.g. 30 vs 50)
    const hasNumbers = /\d+/.test(lower);
    const text = hasNumbers
      ? 'Понимаю. Названная вами сумма — это строгий предел бюджета или готовы рассматривать решение, если оно идеально закроет задачи?'
      : 'Понимаю. Дорого относительно бюджета, похожих вариантов или ценности самого решения?';

    return {
      id: 'p37_price',
      category: 'objection_price',
      ruleId: 'P37',
      actionType: 'CLARIFY',
      text,
      shortReason: 'P37: Изоляция причины возражения по цене без согласия и без защиты объекта.',
      confidenceStatus: 'confirmed',
    };
  }

  // 4. Надо подумать (уточнение предмета размышлений, а не согласие)
  if (
    lower.includes('надо подумать') ||
    lower.includes('я подумаю') ||
    lower.includes('мне нужно подумать') ||
    lower.includes('подумаем')
  ) {
    return {
      id: 'objection_think',
      category: 'objection_think',
      actionType: 'CLARIFY',
      text: 'Конечно. Над чем конкретно хотите подумать — цена, объект, формат или сама необходимость покупки?',
      shortReason: 'Уточнение предмета размышлений вместо банального согласия.',
      confidenceStatus: 'confirmed',
    };
  }

  // 5. Не сейчас / не к спеху / пауза
  if (
    lower.includes('не сейчас') ||
    lower.includes('не к спеху') ||
    lower.includes('не горит') ||
    lower.includes('в следующем году') ||
    lower.includes('через полгода')
  ) {
    return {
      id: 'objection_not_now',
      category: 'objection_timeline',
      actionType: 'CLARIFY',
      text: 'Понял. А с чем связана пауза — ждёте определённого момента по финансам или пока просто изучаете рынок?',
      shortReason: 'Прояснение реальной причины паузы без давления на срочность.',
      confidenceStatus: 'high',
    };
  }

  // 6. Сначала продам свою квартиру (условие, а не срок)
  if (
    lower.includes('сначала продам') ||
    lower.includes('продаем свою') ||
    lower.includes('продаём свою') ||
    lower.includes('продадим квартиру') ||
    lower.includes('пока продаем') ||
    lower.includes('пока продаём')
  ) {
    return {
      id: 'objection_sell_first',
      category: 'objection_condition',
      actionType: 'CLARIFY',
      text: 'Логично. Квартира уже выставлена в рекламу или пока только оцениваете, за сколько реально продать?',
      shortReason: 'Фиксация условия продажи и прояснение стадии без вымышленных сроков сделки.',
      confidenceStatus: 'confirmed',
    };
  }

  // 7. Далеко / локация
  if (
    lower.includes('далеко') ||
    lower.includes('неудобная локация') ||
    lower.includes('далеко от моря') ||
    lower.includes('далеко ехать')
  ) {
    return {
      id: 'objection_far',
      category: 'objection_location',
      actionType: 'CLARIFY',
      text: 'Понимаю. Далеко относительно моря, центра или привычной инфраструктуры для жизни?',
      shortReason: 'Изоляция критерия расстояния и привязка к сценарию использования.',
      confidenceStatus: 'high',
    };
  }

  // 8. Не верю в доходность / сомневаюсь
  if (
    lower.includes('доходност') ||
    lower.includes('не верю в окупаемость') ||
    lower.includes('не окупится') ||
    lower.includes('где гарантии')
  ) {
    return {
      id: 'objection_yield',
      category: 'objection_yield',
      actionType: 'CLARIFY',
      text: 'Справедливое сомнение. А какую доходность на капитал вы считаете реалистичной, чтобы проект имел смысл?',
      shortReason: 'Прояснение ожиданий инвестора по доходности вместо навязывания рекламных расчётов.',
      confidenceStatus: 'high',
    };
  }

  // 9. Хочу сравнить / смотрю другие варианты
  if (
    lower.includes('хочу сравнить') ||
    lower.includes('сравниваю') ||
    lower.includes('смотрим другие варианты') ||
    lower.includes('другие застройщики')
  ) {
    return {
      id: 'objection_compare',
      category: 'objection_compare',
      actionType: 'CLARIFY',
      text: 'Абсолютно верно. А с какими конкретно проектами или локациями сейчас сравниваете?',
      shortReason: 'Выявление реального пула альтернатив и критериев выбора клиента.',
      confidenceStatus: 'high',
    };
  }

  // 10. Нужно обсудить с супругом / семьей
  if (
    lower.includes('с супруг') ||
    lower.includes('с мужем') ||
    lower.includes('с женой') ||
    lower.includes('с семьей') ||
    lower.includes('с семьёй')
  ) {
    return {
      id: 'objection_spouse',
      category: 'objection_decision_maker',
      actionType: 'CLARIFY',
      text: 'Конечно. А что для супруга будет самым критичным в выборе — бюджет, локация или планировка?',
      shortReason: 'Подключение критериев второго лица, принимающего решение.',
      confidenceStatus: 'high',
    };
  }

  // 11. Ипотека / большой платёж
  if (
    lower.includes('ипотек') ||
    lower.includes('платеж') ||
    lower.includes('платёж') ||
    lower.includes('ставка') ||
    lower.includes('первоначальный взнос')
  ) {
    return {
      id: 'objection_mortgage',
      category: 'objection_finance',
      actionType: 'CLARIFY',
      text: 'Понимаю. Дело в одобрении ставки, размере первоначального взноса или комфортном ежемесячном платеже?',
      shortReason: 'Изоляция финансового барьера без навязывания кредитных программ.',
      confidenceStatus: 'high',
    };
  }

  // 12. Риски проекта / долгострой / надежность
  if (
    lower.includes('риск') ||
    lower.includes('долгострой') ||
    lower.includes('не достроят') ||
    lower.includes('статус земли') ||
    lower.includes('снос')
  ) {
    return {
      id: 'objection_risks',
      category: 'objection_security',
      actionType: 'SHOW_EVIDENCE',
      text: 'Понимаю ваше беспокойство. Что именно больше всего настораживает — темпы стройки, статус земли или надежность застройщика?',
      shortReason: 'Изоляция конкретного юридического или строительного риска для предоставления проверяемых фактов.',
      confidenceStatus: 'high',
    };
  }

  // 13. РАЗГРАНИЧЕНИЕ: «Для себя» vs «Переезд» (Требование 6)
  // «Для себя» НЕ означает автоматически переезд, постоянное проживание, школу или детей!
  const hasExplicitLiving =
    lower.includes('буду жить') ||
    lower.includes('будем жить') ||
    lower.includes('переезжаем') ||
    lower.includes('хочу переехать') ||
    lower.includes('планируем переезд') ||
    lower.includes('для постоянного проживания');

  if (hasExplicitLiving) {
    return {
      id: 'p48_explicit_relocation',
      category: 'motive_living',
      ruleId: 'P48',
      actionType: 'CLARIFY',
      text: 'Раз планируете постоянное проживание, что для семьи важнее в первую очередь — тишина и зелень или близость ко всей городской инфраструктуре?',
      shortReason: 'P48: Прямое подтверждение ПМЖ — фокусировка на бытовом сценарии семьи.',
      confidenceStatus: 'confirmed',
    };
  }

  // Если клиент сказал ТОЛЬКО «для себя» без явного подтверждения переезда
  if (lower.includes('для себя')) {
    return {
      id: 'clarify_for_myself_format',
      category: 'motive_neutral',
      actionType: 'CLARIFY',
      text: 'Понял. А для себя — это больше про отдых, сезонное проживание или планируете жить постоянно?',
      shortReason: 'Нейтральное уточнение формата: «для себя» не приравнивается к ПМЖ и школам.',
      confidenceStatus: 'confirmed',
    };
  }

  // 14. Мотив «Пока просто смотрю»
  if (
    lower.includes('просто смотрю') ||
    lower.includes('пока присматриваюсь') ||
    lower.includes('изучаю рынок') ||
    lower.includes('прицениваюсь')
  ) {
    return {
      id: 'clarify_browsing',
      category: 'motive_browsing',
      actionType: 'CLARIFY',
      text: 'Что хотите для себя понять, пока смотрите?',
      shortReason: 'Ровно один открытый вопрос для прояснения ориентиров клиента.',
      confidenceStatus: 'confirmed',
    };
  }

  // 15. Прямой запрос материалов (ANSWER)
  if (
    lower.includes('планировк') ||
    lower.includes('поэтажный план') ||
    lower.includes('договор')
  ) {
    return {
      id: 'answer_materials',
      category: 'action_answer',
      actionType: 'ANSWER',
      text: 'Да, конечно. Куда вам удобнее получить планировки и расчёт — в WhatsApp или Telegram?',
      shortReason: 'ANSWER: Конкретный ответ на прямой запрос материалов без отката к опросу.',
      confidenceStatus: 'confirmed',
    };
  }

  return null;
}
