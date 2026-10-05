import { createResponseText, initialState, transition } from './invite.js';
import { deliverResponse } from './delivery.js';

let state = initialState();
const screens = [...document.querySelectorAll('[data-screen]')];
const yesButton = document.querySelector('#yes-button');
const laterButton = document.querySelector('#later-button');
const sendButton = document.querySelector('#send-response');
const preview = document.querySelector('#response-preview');
const status = document.querySelector('#share-status');

function render() {
  for (const screen of screens) {
    const active = screen.dataset.screen === state.step;
    screen.hidden = !active;
    screen.classList.toggle('is-active', active);
  }
  if (state.step === 'success') {
    preview.textContent = createResponseText('yes');
  }
  screens.find((screen) => screen.dataset.screen === state.step)?.focus({ preventScroll: true });
}

yesButton.addEventListener('click', () => {
  state = transition(state, { type: 'YES' });
  render();
});

laterButton.addEventListener('click', () => {
  const laterText = createResponseText('later');
  deliverResponse(laterText);
});

sendButton.addEventListener('click', () => {
  const text = createResponseText('yes');
  status.textContent = 'Открываю Telegram-чат с Данилом…';
  deliverResponse(text);
});

render();
