import { hydrateReferenceImages } from './reference-assets.js';
import { createResponseText, initialState, transition } from './invite.js';
import { deliverResponse } from './delivery.js';

let state = initialState();
const screens = [...document.querySelectorAll('[data-screen]')];
const yesButton = document.querySelector('#yes-button');
const laterButton = document.querySelector('#later-button');
const sendButton = document.querySelector('#send-response');
const preview = document.querySelector('#response-preview');
const status = document.querySelector('#share-status');
const canvas = document.querySelector('.phone-canvas');
const assetLoader = document.querySelector('#asset-loader');

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

hydrateReferenceImages()
  .then(() => {
    document.documentElement.classList.add('assets-ready');
    canvas?.setAttribute('aria-busy', 'false');
    if (assetLoader) assetLoader.hidden = true;
  })
  .catch(() => {
    canvas?.setAttribute('aria-busy', 'false');
    if (assetLoader) assetLoader.textContent = 'Не удалось загрузить приглашение. Обнови страницу.';
  });
