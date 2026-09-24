/**
 * Prefer a large share/hero image over WordPress sized derivatives or our -thumb keys.
 */
export function preferShareImageUrl(
  url: string | null | undefined,
): string | null {
  const raw = url?.trim();
  if (!raw) return null;

  let next = raw;
  next = next.replace(/-\d{2,4}x\d{2,4}(\.[a-zA-Z0-9]+)(?=[?#]|$)/, '$1');
  next = next.replace(/-thumb(\.[a-zA-Z0-9]+)(?=[?#]|$)/, '$1');
  return next;
}

export function absoluteShareUrl(
  origin: string,
  url: string | null | undefined,
): string | null {
  const preferred = preferShareImageUrl(url);
  if (!preferred) return null;
  if (/^https?:\/\//i.test(preferred)) return preferred;
  const base = origin.replace(/\/+$/, '');
  return `${base}${preferred.startsWith('/') ? preferred : `/${preferred}`}`;
}
