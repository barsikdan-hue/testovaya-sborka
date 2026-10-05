import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTelegramUrl, deliverResponse } from '../public/js/delivery.js';

test('builds a direct Telegram chat URL for Danil with encoded draft text', () => {
  const url = buildTelegramUrl('Да ❤️ Я согласна на свидание.');
  assert.equal(
    url,
    'https://t.me/DanilVlasenk?text=%D0%94%D0%B0%20%E2%9D%A4%EF%B8%8F%20%D0%AF%20%D1%81%D0%BE%D0%B3%D0%BB%D0%B0%D1%81%D0%BD%D0%B0%20%D0%BD%D0%B0%20%D1%81%D0%B2%D0%B8%D0%B4%D0%B0%D0%BD%D0%B8%D0%B5.'
  );
});

test('opens Danil Telegram chat with the prepared answer', () => {
  const location = { href: 'https://date-invite-danil.onrender.com' };
  const result = deliverResponse('Давай выберем другой день 🙂', location);

  assert.equal(result, 'telegram');
  assert.equal(
    location.href,
    'https://t.me/DanilVlasenk?text=%D0%94%D0%B0%D0%B2%D0%B0%D0%B9%20%D0%B2%D1%8B%D0%B1%D0%B5%D1%80%D0%B5%D0%BC%20%D0%B4%D1%80%D1%83%D0%B3%D0%BE%D0%B9%20%D0%B4%D0%B5%D0%BD%D1%8C%20%F0%9F%99%82'
  );
});
