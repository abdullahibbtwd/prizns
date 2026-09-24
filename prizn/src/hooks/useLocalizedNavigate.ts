import { useNavigate, type NavigateOptions } from 'react-router-dom'
import { useJournalLang } from '@/hooks/useJournalLang'
import { withLocale } from '@/lib/locale-path'

/** navigate() that prefixes `/en` when the journal is in English. */
export function useLocalizedNavigate() {
  const navigate = useNavigate()
  const { lang } = useJournalLang()

  return (to: string | number, options?: NavigateOptions) => {
    if (typeof to === 'number') {
      navigate(to)
      return
    }
    navigate(withLocale(to, lang), options)
  }
}
