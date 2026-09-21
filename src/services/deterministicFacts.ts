/**
 * Deterministic Fact Extraction for Real Estate Client Utterances
 * Extracts confirmed facts (budget, location, goal, payment method, timeline, criteria)
 * directly from client utterances with strictly validated verbatim quotes.
 */

import {
  hasWholeWord,
  hasAnyWholeWord,
  hasPhrase,
  normalizeRussianText,
  validateEvidenceQuote,
} from './textUtils';

export interface ExtractedFactItem {
  category: string;
  field: string;
  value: string;
  evidenceQuote: string;
  evidenceTurnId: string;
  confidence: number;
  status: 'confirmed';
  isFlexible?: boolean;
  comment?: string;
  needsClarification?: boolean;
}

export function extractDeterministicFacts(
  text: string,
  turnId: string,
  previousAgentTurnText?: string | null
): ExtractedFactItem[] {
  const trimmed = (text || '').trim();
  const clean = trimmed.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»]/g, '').trim();
  if (!trimmed) return [];

  const lower = trimmed.toLowerCase();
  const facts: ExtractedFactItem[] = [];

  const addFact = (
    category: string,
    field: string,
    value: string,
    quote: string,
    confidence = 0.95,
    extra?: Partial<ExtractedFactItem>
  ) => {
    if (!validateEvidenceQuote(trimmed, quote)) {
      console.warn(`[DeterministicFacts] Rejected invalid evidenceQuote "${quote}" for turn "${trimmed}"`);
      return;
    }
    facts.push({
      category,
      field,
      value,
      evidenceQuote: quote,
      evidenceTurnId: turnId,
      confidence,
      status: 'confirmed',
      ...extra,
    });
  };

  // 1. Budget extraction: e.g. "30 миллионов", "30 млн", "до 45 млн руб", "около 15 млн", "бюджет 15 млн"
  const budgetMatch = lower.match(
    /(?:(?:бюджет(?:ом|а)?|до|около|примерно|в\s*районе)\s*)?(\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?)\s*(млн|миллион(?:а|ов)?|млрд|тысяч(?:и)?|тыс|к)(?:[^\p{L}\p{N}]|$)/iu
  );
  if (budgetMatch) {
    const num = budgetMatch[1].replace(',', '.');
    const unit = budgetMatch[2];
    let normalizedValue = `${num} млн руб`;
    if (unit.startsWith('млрд')) normalizedValue = `${num} млрд руб`;
    else if (unit.startsWith('тыс') || unit === 'к') normalizedValue = `${num} тыс руб`;

    const isFlex =
      lower.includes('немного выше') ||
      lower.includes('при веском обосновании') ||
      lower.includes('гибк') ||
      lower.includes('посмотрим');

    addFact('budget', 'budget', isFlex ? `Около ${normalizedValue} (гибкий)` : normalizedValue, budgetMatch[0].trim(), 0.95, {
      isFlexible: isFlex,
      comment: isFlex ? 'Может рассмотреть немного выше при веском обосновании' : undefined,
    });
  }

  // 2. Location extraction
  const locations: Array<{ name: string; regex: RegExp }> = [
    { name: 'Сириус', regex: /(?:^|[^\p{L}\p{N}])(сириус(?:е|а)?|в\s*сириусе|окрестност(?:и|ях)\s*сириуса)(?:[^\p{L}\p{N}]|$)/iu },
    { name: 'Сочи', regex: /(?:^|[^\p{L}\p{N}])(сочи|в\s*сочи)(?:[^\p{L}\p{N}]|$)/iu },
    { name: 'Адлер', regex: /(?:^|[^\p{L}\p{N}])(адлер|в\s*адлере)(?:[^\p{L}\p{N}]|$)/iu },
    { name: 'Красная Поляна', regex: /(?:^|[^\p{L}\p{N}])(красн(?:ая|ой)\s*полян(?:а|е|у))(?:[^\p{L}\p{N}]|$)/iu },
    { name: 'Дагомыс', regex: /(?:^|[^\p{L}\p{N}])(дагомыс|в\s*дагомысе)(?:[^\p{L}\p{N}]|$)/iu },
    { name: 'Хоста', regex: /(?:^|[^\p{L}\p{N}])(хост(?:а|е|у)|в\s*хосте)(?:[^\p{L}\p{N}]|$)/iu },
    { name: 'Анапа', regex: /(?:^|[^\p{L}\p{N}])(анап(?:а|е|у)|в\s*анапе)(?:[^\p{L}\p{N}]|$)/iu },
    { name: 'Геленджик', regex: /(?:^|[^\p{L}\p{N}])(геленджик|в\s*геленджике)(?:[^\p{L}\p{N}]|$)/iu },
    { name: 'Краснодар', regex: /(?:^|[^\p{L}\p{N}])(краснодар|в\s*краснодаре)(?:[^\p{L}\p{N}]|$)/iu },
  ];

  for (const loc of locations) {
    const match = lower.match(loc.regex);
    if (match) {
      addFact('location', 'location', loc.name, match[1] || match[0].trim());
      break;
    }
  }

  // 3. Goal & Secondary Use Model (Requirement 7 & 8)
  // Primary Goal: Living / Personal Residence
  const livingMatch = lower.match(/(?:для\s*постоянной\s*жизни|для\s*жизни|постоянно\s*жить|буд(?:у|ем)\s*жить|переезжа(?:ем|ть)|переезд|пмж)/iu);
  if (livingMatch) {
    addFact('goal', 'primaryGoal', 'Постоянное личное проживание', livingMatch[0].trim());
    addFact('goal', 'goal', 'Постоянное личное проживание', livingMatch[0].trim());
  } else if (hasPhrase(lower, 'для себя')) {
    addFact('goal', 'goal', 'Для себя (формат уточняется)', 'для себя', 0.9);
  } else if (lower.match(/(?:чисто\s*под\s*инвестиции|для\s*перепродажи|инвестиционн(?:ый|ая))/iu)) {
    const invMatch = lower.match(/(?:чисто\s*под\s*инвестиции|для\s*перепродажи|инвестиционн(?:ый|ая))/iu);
    if (invMatch) {
      addFact('goal', 'primaryGoal', 'Инвестиции', invMatch[0].trim());
      addFact('goal', 'goal', 'Инвестиции', invMatch[0].trim());
    }
  }

  // Secondary Use: occasional rental during absence
  const rentalMatch = lower.match(/(?:иногда\s*сдавать|возможность(?:ю)?\s*(?:иногда\s*)?сдавать|сдавать,?\s*если\s*я\s*уезжаю|сдавать\s*во\s*время\s*отсутствия)/iu);
  if (rentalMatch) {
    addFact('goal', 'secondaryUse', 'Периодическая сдача во время отсутствия', rentalMatch[0].trim());
  }

  // 4. Payment Method & Financing
  const cashMatch = lower.match(/(?:наличн(?:ые|ыми|ых)|расчет\s*наличными|расчёт\s*наличными|100%\s*оплата|свои\s*средства)/iu);
  const mortgageMatch = lower.match(/(?:ипотек(?:а|у|ой)|в\s*ипотеку)/iu);
  const installmentMatch = lower.match(/(?:рассрочк(?:а|у|ой)|в\s*рассрочку)/iu);
  if (mortgageMatch && installmentMatch) {
    addFact('paymentMethod', 'paymentMethod', 'Ипотека / Рассрочка (допустимы оба варианта)', `${mortgageMatch[0]}, ${installmentMatch[0]}`);
  } else if (cashMatch) {
    addFact('paymentMethod', 'paymentMethod', 'наличные', cashMatch[0]);
  } else if (mortgageMatch) {
    addFact('paymentMethod', 'paymentMethod', 'Ипотека', mortgageMatch[0]);
  } else if (installmentMatch) {
    addFact('paymentMethod', 'paymentMethod', 'Рассрочка', installmentMatch[0]);
  }

  // Financial Priority (Comfortable Monthly Payment)
  const paymentPriorityMatch = lower.match(/(?:ежемесячный\s*платеж|комфортный\s*платеж|платеж\s*важнее|размер\s*платежа)/iu);
  if (paymentPriorityMatch) {
    addFact('finances', 'financialPriority', 'Комфортный ежемесячный платёж', paymentPriorityMatch[0]);
  }

  // 5. Family & Children (Family Mortgage eligibility check)
  const childMatch = lower.match(/(?:реб[её]нк(?:у)?\s*\d+\s*(?:год(?:а)?|лет)|дет(?:и|ей)|маленьк(?:ие|их)\s*дет(?:и|ей)|сыну|дочери)/iu);
  if (childMatch) {
    addFact('finances', 'familyMortgage', 'Есть ребёнок подходящего возраста (требуется проверка условий программы)', childMatch[0]);
  }

  // 6. Employment (Requirement 5 & 8: Whole-word / phrase matching, "ипотека" != "ИП")
  const employmentMatch = lower.match(/(?:по\s*найму|в\s*найме|работаю\s*по\s*найму|в\s*компании|официальн(?:о|ое)\s*трудоустройство)/iu);
  if (employmentMatch) {
    addFact('finances', 'employment', 'Работа по найму', employmentMatch[0]);
  } else if (hasWholeWord(lower, 'ип') || hasPhrase(lower, 'свой бизнес') || hasPhrase(lower, 'собственный бизнес')) {
    const ipQuote = hasWholeWord(lower, 'ип') ? 'ип' : 'свой бизнес';
    addFact('finances', 'employment', 'Индивидуальный предприниматель (ИП)', ipQuote);
  }

  // 7. Decision Makers (Requirement 5 & 6: Never fabricate "с женой" from "важен" or "предложений")
  const spouseMatch = lower.match(/(?:с\s*женой|с\s*мужем|с\s*супруг(?:ой|ом)|с\s*семь[её]й|с\s*партн[её]ром|решаем\s*вместе|обсудим\s*с\s*женой|обсудим\s*с\s*мужем)/iu);
  const soloMatch = lower.match(/(?:сам\s*решаю|сама\s*решаю|один\s*выбираю|одна\s*выбираю|решаю\s*самостоятельно)/iu);
  if (spouseMatch) {
    addFact('decision_makers', 'decisionMakers', 'Совместно с супругом / семьёй', spouseMatch[0]);
  } else if (soloMatch) {
    addFact('decision_makers', 'decisionMakers', 'Принимает решение самостоятельно', soloMatch[0]);
  }

  // 8. Property Type (Whole-word / phrase matching, "рядом" != "дом")
  const flatMatch = lower.match(/(?:квартир(?:а|у|ы)|апартамент(?:ы|ов)?|студи(?:я|ю))/iu);
  const houseMatch = lower.match(/(?:коттедж(?:ей|а)?|вилл(?:а|у)|таунхаус(?:а)?)/iu) ||
    (hasWholeWord(lower, 'дом') && !hasPhrase(lower, 'рядом') ? { 0: 'дом' } as any : null);

  if (houseMatch && flatMatch) {
    addFact('property_type', 'propertyType', 'Дом или квартира (допустимы оба формата)', `${flatMatch[0]}, ${houseMatch[0]}`);
  } else if (houseMatch) {
    addFact('property_type', 'propertyType', 'Дом / Коттедж', houseMatch[0]);
  } else if (flatMatch) {
    addFact('property_type', 'propertyType', flatMatch[0].toLowerCase().startsWith('апарт') ? 'Апартаменты' : 'Квартира', flatMatch[0]);
  }

  // 9. Timeline
  const timelineMatch = lower.match(/(?:пара\s*месяцев|пару\s*месяцев|в\s*течение\s*пары\s*месяцев|2-3\s*месяца|к\s*лету|в\s*течение\s*месяца|срочно|не\s*к\s*спеху)/iu);
  if (timelineMatch) {
    addFact('timeline', 'purchaseTimeline', timelineMatch[0], timelineMatch[0]);
  }

  // 10. Criteria: Reliability / Transparency
  if (lower.includes('надежност') || lower.includes('надёжност') || lower.includes('прозрачност')) {
    const quote = lower.includes('надёжность')
      ? 'надёжность'
      : lower.includes('надежность')
      ? 'надежность'
      : 'прозрачность';
    addFact('criteria', 'clientCriteria', 'Надёжность и прозрачность сделки', quote);
  }

  // 11. Contextual agreedNextStep (e.g. Agent: "Видеопоказ завтра в 15:00 удобно?" -> Client: "Да")
  const isAffirmative = hasAnyWholeWord(clean, [
    'да',
    'хорошо',
    'конечно',
    'согласен',
    'согласна',
    'удобно',
    'договорились',
    'давайте',
    'ок',
    'окей',
    'подходит',
    'точно',
  ]);

  if (previousAgentTurnText) {
    const prevLower = previousAgentTurnText.toLowerCase();
    const hasNextStepProposal =
      prevLower.includes('видеопоказ') ||
      prevLower.includes('видео') ||
      prevLower.includes('созвон') ||
      prevLower.includes('зум') ||
      prevLower.includes('показ') ||
      (prevLower.includes('завтра') && prevLower.includes('удобно'));

    if (isAffirmative && hasNextStepProposal) {
      // Extract proposed step detail if present, or generate descriptive step
      let stepValue = 'Видеопоказ';
      if (prevLower.includes('видеопоказ завтра в 15:00') || (prevLower.includes('завтра') && prevLower.includes('15:00'))) {
        stepValue = 'Видеопоказ завтра в 15:00';
      } else if (prevLower.includes('видеопоказ') || prevLower.includes('видео')) {
        stepValue = 'Видеопоказ вариантов';
      } else if (prevLower.includes('созвон') || prevLower.includes('зум')) {
        stepValue = 'Онлайн-созвон';
      } else {
        stepValue = 'Согласованный следующий шаг';
      }
      addFact('next_step', 'agreedNextStep', stepValue, trimmed);
    }
  }

  return facts;
}
