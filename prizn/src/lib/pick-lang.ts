import type { JournalLang } from '@/components/concept-3/JournalShell'

/** Pick EN or BG content the same way the public journal does.
 * English that is blank or identical to Bulgarian is treated as untranslated.
 */
export function pickLang(
  lang: JournalLang,
  en: string | null | undefined,
  bg: string | null | undefined,
): string {
  const english = (en || '').trim()
  const bulgarian = (bg || '').trim()
  if (lang === 'bg') return bulgarian || english
  if (english && english !== bulgarian) return english
  return bulgarian || english
}
