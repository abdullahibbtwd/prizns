/** Official irrevocable rate: 1 EUR = 1.95583 BGN (Bulgaria euro adoption). */
export const BGN_PER_EUR = 1.95583;

/** Convert a lev amount to Stripe EUR cents (rounded to nearest cent). */
export function bgnToEurCents(amountBgn: number): number {
  return Math.round((Number(amountBgn) / BGN_PER_EUR) * 100);
}

/**
 * Build an absolute site URL with percent-encoded path (Cyrillic-safe for Stripe).
 */
export function absoluteSiteUrl(
  base: string,
  path: string,
  query?: Record<string, string>,
): string {
  const normalizedBase = base.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(normalizedPath, `${normalizedBase}/`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}
