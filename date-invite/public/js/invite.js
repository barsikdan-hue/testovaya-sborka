const VALID_ANSWERS = new Set(['yes', 'later']);

export function initialState() {
  return { step: 'sealed', answer: null };
}

export function transition(state, event) {
  if (state.step === 'sealed' && event.type === 'OPEN') {
    return { step: 'letter', answer: null };
  }

  if (state.step === 'letter' && event.type === 'CONTINUE') {
    return { step: 'choice', answer: null };
  }

  if (
    state.step === 'choice' &&
    event.type === 'ANSWER' &&
    VALID_ANSWERS.has(event.value)
  ) {
    return { step: 'result', answer: event.value };
  }

  return state;
}

export function createResponseText(answer, config) {
  const sender = config?.senderName?.trim() || 'Данил';

  if (answer === 'yes') {
    return `Да ❤️ Я согласна на свидание. ${sender}, теперь выбираем день 🙂`;
  }

  return `Идея мне нравится 🙂 Давай вместе выберем другой день, ${sender}.`;
}
