import type { JournalLang } from '@/components/concept-3/JournalShell'

/** Pick EN or BG content the same way the public journal does. */
export function pickLang(
  lang: JournalLang,
  en: string | null | undefined,
  bg: string | null | undefined,
): string {
  if (lang === 'bg') return (bg || en || '').trim()
  return (en || bg || '').trim()
}
