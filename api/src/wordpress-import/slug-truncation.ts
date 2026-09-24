/** Detect old mid-word .slice(0, N) slug cuts vs the ideal slugify output. */
export function looksMidWordTruncated(current: string, ideal: string): boolean {
  if (!current || !ideal || current === ideal) return false;
  if (ideal.startsWith(current) && current.length >= 55) return true;
  if (current.length < 70) return false;
  const last = current.split('-').pop() || '';
  if (last.length < 2) return true;
  return ideal.split('-').some(
    (part) => part.startsWith(last) && part !== last && last.length >= 3,
  );
}
