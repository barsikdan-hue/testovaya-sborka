import { inviteConfig } from './config.js';
import { createResponseText, initialState, transition } from './invite.js';
import { deliverResponse } from './delivery.js';

let state = initialState();

const screens = [...document.querySelectorAll('[data-screen]')];
const openButton = document.querySelector('#open-invite');
const continueButton = document.querySelector('#continue-invite');
const answerButtons = [...document.querySelectorAll('[data-answer]')];
const sendButton = document.querySelector('#send-response');
const statusNode = document.querySelector('#share-status');

const copy = {
  eyebrow: document.querySelector('#eyebrow'),
  introTitle: document.querySelector('#intro-title'),
  letterTitle: document.querySelector('#letter-title'),
  letterText: document.querySelector('#letter-text'),
  question: document.querySelector('#question'),
  resultTitle: document.querySelector('#result-title'),
  resultText: document.querySelector('#result-text'),
  responsePreview: document.querySelector('#response-preview')
};

copy.eyebrow.textContent = inviteConfig.eyebrow;
copy.introTitle.textContent = inviteConfig.introTitle;
copy.letterTitle.textContent = inviteConfig.letterTitle;
copy.letterText.textContent = inviteConfig.letterText;
copy.question.textContent = inviteConfig.question;

function render() {
  for (const screen of screens) {
    const active = screen.dataset.screen === state.step;
    screen.hidden = !active;
    screen.classList.toggle('is-active', active);
  }

  if (state.step === 'result') {
    const accepted = state.answer === 'yes';
    copy.resultTitle.textContent = accepted ? inviteConfig.yesTitle : inviteConfig.laterTitle;
    copy.resultText.textContent = accepted ? inviteConfig.yesText : inviteConfig.laterText;
    copy.responsePreview.textContent = createResponseText(state.answer, inviteConfig);
  }

  const active = screens.find((screen) => screen.dataset.screen === state.step);
  active?.focus({ preventScroll: true });
}

function dispatch(event) {
  state = transition(state, event);
  statusNode.textContent = '';
  render();
}

openButton.addEventListener('click', () => dispatch({ type: 'OPEN' }));
continueButton.addEventListener('click', () => dispatch({ type: 'CONTINUE' }));
for (const button of answerButtons) {
  button.addEventListener('click', () => dispatch({ type: 'ANSWER', value: button.dataset.answer }));
}

sendButton.addEventListener('click', async () => {
  const text = createResponseText(state.answer, inviteConfig);
  const result = await deliverResponse(text);

  const messages = {
    shared: 'Готово. Теперь Данил узнает твой ответ 🙂',
    copied: 'Ответ скопирован. Просто вставь его в ваш чат с Данилом.',
    cancelled: 'Ничего не отправилось. Ответ всё ещё здесь, можно попробовать ещё раз.',
    manual: 'Автоотправка недоступна. Скопируй текст выше и отправь Данилу в ваш чат.'
  };

  statusNode.textContent = messages[result];
});

render();
