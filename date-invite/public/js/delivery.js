export async function deliverResponse(text, nav = globalThis.navigator) {
  if (nav?.share) {
    try {
      await nav.share({ title: 'Мой ответ', text });
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
    }
  }

  if (nav?.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(text);
      return 'copied';
    } catch {
      return 'manual';
    }
  }

  return 'manual';
}
