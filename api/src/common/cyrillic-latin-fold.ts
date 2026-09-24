/**
 * Latin ↔ Cyrillic look-alike folding for Bulgarian search/data quality.
 * Catches titles like "Oля" (Latin O) that fail exact Cyrillic queries.
 */

const LATIN_TO_CYRILLIC: Record<string, string> = {
  A: 'А',
  a: 'а',
  B: 'В',
  E: 'Е',
  e: 'е',
  K: 'К',
  k: 'к',
  M: 'М',
  m: 'м',
  H: 'Н',
  O: 'О',
  o: 'о',
  P: 'Р',
  p: 'р',
  C: 'С',
  c: 'с',
  T: 'Т',
  t: 'т',
  X: 'Х',
  x: 'х',
  Y: 'У',
  y: 'у',
};

const CYRILLIC_TO_LATIN: Record<string, string> = Object.fromEntries(
  Object.entries(LATIN_TO_CYRILLIC).map(([latin, cyr]) => [cyr, latin]),
);

/** Replace Latin look-alikes with Cyrillic equivalents. */
export function foldLatinToCyrillic(value: string): string {
  return [...value].map((ch) => LATIN_TO_CYRILLIC[ch] ?? ch).join('');
}

/** Replace Cyrillic look-alikes with Latin equivalents. */
export function foldCyrillicToLatin(value: string): string {
  return [...value].map((ch) => CYRILLIC_TO_LATIN[ch] ?? ch).join('');
}

/** Unique query variants so mixed-script titles still match. */
export function searchLookalikeVariants(q: string): string[] {
  const trimmed = q.trim();
  if (!trimmed) return [];
  const variants = new Set<string>([trimmed]);
  const toCyr = foldLatinToCyrillic(trimmed);
  const toLat = foldCyrillicToLatin(trimmed);
  if (toCyr !== trimmed) variants.add(toCyr);
  if (toLat !== trimmed) variants.add(toLat);
  return [...variants];
}

const CYRILLIC = /[\u0400-\u04FF]/;
const LATIN_LETTER = /[A-Za-z]/;

/**
 * Latin letters embedded inside otherwise-Cyrillic words (e.g. "Oля").
 * Returns the fixed string when look-alike folding changes it.
 */
export function fixMixedScriptLookalikes(value: string): string | null {
  if (!value || !CYRILLIC.test(value) || !LATIN_LETTER.test(value)) return null;

  // Token-level: only fold Latin chars that sit next to Cyrillic in the same word.
  const fixed = value.replace(/[\p{L}\p{M}]+/gu, (word) => {
    const hasCyr = CYRILLIC.test(word);
    const hasLat = LATIN_LETTER.test(word);
    if (hasCyr && hasLat) return foldLatinToCyrillic(word);
    return word;
  });

  return fixed === value ? null : fixed;
}
