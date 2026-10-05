import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, transition, createResponseText } from '../public/js/invite.js';

test('initial state starts on invitation screen', () => {
  assert.deepEqual(initialState(), { step: 'invitation', answer: null });
});

test('YES moves invitation to success and repeated events keep stable result', () => {
  const accepted = transition(initialState(), { type: 'YES' });
  assert.deepEqual(accepted, { step: 'success', answer: 'yes' });
  assert.deepEqual(transition(accepted, { type: 'YES' }), accepted);
  assert.deepEqual(transition(accepted, { type: 'LATER' }), accepted);
});

test('LATER stays on invitation because Telegram opens directly', () => {
  const state = initialState();
  assert.deepEqual(transition(state, { type: 'LATER' }), state);
});

test('response texts are exact and tracking-free', () => {
  assert.equal(
    createResponseText('yes'),
    'Да ❤️ Я согласна. Посмотрим, что ты придумал 😌'
  );
  assert.equal(
    createResponseText('later'),
    'Давай выберем другой день 🙂'
  );
});
