export function initialState() {
  return { step: 'invitation', answer: null };
}

export function transition(state, event) {
  if (state.step === 'invitation' && event.type === 'YES') {
    return { step: 'success', answer: 'yes' };
  }
  return state;
}

export function createResponseText(answer) {
  return answer === 'yes'
    ? 'Да ❤️ Я согласна. Посмотрим, что ты придумал 😌'
    : 'Давай выберем другой день 🙂';
}
