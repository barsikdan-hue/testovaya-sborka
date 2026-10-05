const TELEGRAM_USERNAME = 'DanilVlasenk';

export function buildTelegramUrl(text, username = TELEGRAM_USERNAME) {
  return `https://t.me/${username}?text=${encodeURIComponent(text)}`;
}

export function deliverResponse(text, location = globalThis.location) {
  location.href = buildTelegramUrl(text);
  return 'telegram';
}
