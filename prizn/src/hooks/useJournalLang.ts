import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { JournalLang } from '@/components/concept-3/JournalShell'
import {
  alternateLocalePath,
  localeFromPath,
} from '@/lib/locale-path'

const STORAGE_KEY = 'prizni-lang'

export function useJournalLang() {
  const { i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const onCms = location.pathname.startsWith('/cms')
  const lang = (
    onCms
      ? i18n.language === 'en'
        ? 'en'
        : 'bg'
      : localeFromPath(location.pathname)
  ) as JournalLang

  useEffect(() => {
    if (!onCms && i18n.language !== lang) {
      void i18n.changeLanguage(lang)
    }
    window.localStorage.setItem(STORAGE_KEY, lang)
  }, [lang, i18n, onCms])

  const setLang = (next: JournalLang) => {
    if (next === lang) return
    void i18n.changeLanguage(next)
    window.localStorage.setItem(STORAGE_KEY, next)
    if (onCms) return
    const target = alternateLocalePath(
      `${location.pathname}${location.search}${location.hash}`,
      next,
    )
    navigate(target)
  }

  return { lang, setLang }
}
