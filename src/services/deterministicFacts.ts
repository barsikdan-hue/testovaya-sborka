/**
 * Deterministic Fact Extraction for Real Estate Client Utterances
 * Extracts confirmed facts (budget, location, goal, decision maker, timeline) directly
 * from client utterances so no data is lost even when local objections trigger instant replies.
 */

export interface ExtractedFactItem {
  category: string;
  field: string;
  value: string;
  evidenceQuote: string;
  evidenceTurnId: string;
  confidence: number;
  status: 'confirmed';
}

export function extractDeterministicFacts(text: string, turnId: string): ExtractedFactItem[] {
  const trimmed = (text || '').trim();
  if (!trimmed) return [];

  const lower = trimmed.toLowerCase();
  const facts: ExtractedFactItem[] = [];

  // 1. Budget extraction: e.g. "30 миллионов", "30 млн", "до 45 млн руб", "бюджет 30 млн"
  const budgetMatch = lower.match(
    /(?:(?:бюджет(?:ом|а)?|до|около|примерно|в\s*районе)\s*)?(\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?)\s*(млн|миллион(?:а|ов)?|млрд|тысяч(?:и)?|тыс|к)(?:[^\p{L}\p{N}]|$)/iu
  );
  if (budgetMatch) {
    const num = budgetMatch[1].replace(',', '.');
    const unit = budgetMatch[2];
    let normalizedValue = `${num} млн руб`;
    if (unit.startsWith('млрд')) normalizedValue = `${num} млрд руб`;
    else if (unit.startsWith('тыс') || unit === 'к') normalizedValue = `${num} тыс руб`;

    facts.push({
      category: 'budget',
      field: 'budget',
      value: normalizedValue,
      evidenceQuote: budgetMatch[0].trim(),
      evidenceTurnId: turnId,
      confidence: 0.95,
      status: 'confirmed',
    });
  }

  // 2. Location extraction
  const locations: Array<{ name: string; regex: RegExp }> = [
    { name: 'Сочи', regex: /(?:^|[^\p{L}\p{N}])(сочи|в\s*сочи)(?:[^\p{L}\p{N}]|$)/iu },
    { name: 'Адлер', regex: /(?:^|[^\p{L}\p{N}])(адлер|в\s*адлере)(?:[^\p{L}\p{N}]|$)/iu },
    { name: 'Сириус', regex: /(?:^|[^\p{L}\p{N}])(сириус|в\s*сириусе)(?:[^\p{L}\p{N}]|$)/iu },
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
      facts.push({
        category: 'location',
        field: 'location',
        value: loc.name,
        evidenceQuote: match[0].trim(),
        evidenceTurnId: turnId,
        confidence: 0.95,
        status: 'confirmed',
      });
      break;
    }
  }

  // 3. Goal / Motive extraction
  if (
    lower.includes('буду жить') ||
    lower.includes('будем жить') ||
    lower.includes('переезжа') ||
    lower.includes('переезд') ||
    lower.includes('постоянного проживания') ||
    lower.includes('жить постоянно') ||
    lower.includes('пмж')
  ) {
    facts.push({
      category: 'goal',
      field: 'goal',
      value: 'Постоянное проживание (ПМЖ)',
      evidenceQuote: 'переезд / постоянное проживание',
      evidenceTurnId: turnId,
      confidence: 0.95,
      status: 'confirmed',
    });
  } else if (
    lower.includes('инвест') ||
    lower.includes('пассивный доход') ||
    lower.includes('доходност') ||
    (lower.includes('сдач') && !lower.includes('отдых'))
  ) {
    facts.push({
      category: 'goal',
      field: 'goal',
      value: 'Инвестиции / Аренда',
      evidenceQuote: 'инвестиции / арендный доход',
      evidenceTurnId: turnId,
      confidence: 0.95,
      status: 'confirmed',
    });
  } else if (lower.includes('для себя')) {
    facts.push({
      category: 'goal',
      field: 'goal',
      value: 'Для себя',
      evidenceQuote: 'для себя',
      evidenceTurnId: turnId,
      confidence: 0.9,
      status: 'confirmed',
    });
  } else if (lower.includes('отдых') || lower.includes('на лето') || lower.includes('сезон')) {
    facts.push({
      category: 'goal',
      field: 'goal',
      value: 'Отдых / Сезонное проживание',
      evidenceQuote: 'отдых / сезон',
      evidenceTurnId: turnId,
      confidence: 0.9,
      status: 'confirmed',
    });
  }

  // 4. Decision Maker
  if (lower.includes('муж') || lower.includes('жен') || lower.includes('супруг') || lower.includes('партнер')) {
    const quote = lower.includes('муж')
      ? 'с мужем'
      : lower.includes('жен')
      ? 'с женой'
      : lower.includes('супруг')
      ? 'с супругом'
      : 'с партнёром';
    facts.push({
      category: 'decision_makers',
      field: 'decisionMakers',
      value: 'Совместно с супругом/партнёром',
      evidenceQuote: quote,
      evidenceTurnId: turnId,
      confidence: 0.9,
      status: 'confirmed',
    });
  }

  return facts;
}
