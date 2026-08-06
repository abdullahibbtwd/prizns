import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { JournalLang } from '@/components/concept-3/JournalShell'

const STORAGE_KEY = 'prizni-lang'

export function useJournalLang() {
  const { i18n } = useTranslation()
  const lang = (i18n.language === 'en' ? 'en' : 'bg') as JournalLang

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, lang)
  }, [lang])

  const setLang = (next: JournalLang) => {
    void i18n.changeLanguage(next)
  }

  return { lang, setLang }
}
