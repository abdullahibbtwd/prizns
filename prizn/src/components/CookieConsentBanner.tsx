import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Cookie } from 'lucide-react'
import { useJournalLang } from '@/hooks/useJournalLang'
import {
  getCookieConsent,
  setCookieConsent,
  type CookieConsent,
} from '@/lib/cookie-consent'

const copy = {
  en: {
    title: 'Cookies',
    body: 'We save a private visitor ID to measure reading time — never for ads.',
    accept: 'Accept',
    decline: 'No thanks',
  },
  bg: {
    title: 'Бисквитки',
    body: 'Запазваме личен ID за време на четене — никога за реклами.',
    accept: 'Приемам',
    decline: 'Не, благодаря',
  },
} as const

export function CookieConsentBanner() {
  const location = useLocation()
  const { lang } = useJournalLang()
  const [consent, setConsent] = useState<CookieConsent>(null)
  const [ready, setReady] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setConsent(getCookieConsent())
    setReady(true)

    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<CookieConsent>).detail
      setConsent(detail ?? getCookieConsent())
    }
    window.addEventListener('prizni-cookie-consent', onChange)
    return () => window.removeEventListener('prizni-cookie-consent', onChange)
  }, [])

  useEffect(() => {
    if (!ready || consent !== null) {
      setVisible(false)
      return
    }
    if (location.pathname.startsWith('/cms')) {
      setVisible(false)
      return
    }
    const id = window.setTimeout(() => setVisible(true), 420)
    return () => window.clearTimeout(id)
  }, [ready, consent, location.pathname])

  const accept = useCallback(() => {
    setVisible(false)
    window.setTimeout(() => {
      setCookieConsent('accepted')
      setConsent('accepted')
    }, 220)
  }, [])

  const decline = useCallback(() => {
    setVisible(false)
    window.setTimeout(() => {
      setCookieConsent('declined')
      setConsent('declined')
    }, 220)
  }, [])

  if (!ready) return null
  if (location.pathname.startsWith('/cms')) return null
  if (consent !== null && !visible) return null

  const t = copy[lang === 'bg' ? 'bg' : 'en']

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t.title}
      className="print-hidden pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex justify-center p-3 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:justify-end sm:p-0"
    >
      <div
        className={[
          'pointer-events-auto w-full max-w-[22rem] overflow-hidden rounded-2xl',
          'border border-white/60 bg-[#FDFBF7]/90 shadow-[0_12px_40px_-12px_rgba(12,38,134,0.28)]',
          'ring-1 ring-[#0C2686]/8 backdrop-blur-xl',
          'transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
          visible
            ? 'translate-y-0 opacity-100'
            : 'translate-y-4 opacity-0 sm:translate-y-3 sm:translate-x-2',
        ].join(' ')}
      >
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#0C2686]/35 to-transparent" />

        <div className="flex gap-3 px-3.5 py-3.5">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0C2686] to-[#4051C7] text-amber-50 shadow-sm">
            <Cookie className="size-3.5" strokeWidth={1.75} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-heading text-[13px] font-semibold tracking-wide text-[#0C2686]">
              {t.title}
            </p>
            <p className="mt-0.5 text-[12px] leading-snug text-stone-500">
              {t.body}
            </p>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={decline}
                className="rounded-full px-2.5 py-1.5 text-[11px] font-medium text-stone-500 transition hover:bg-stone-100/80 hover:text-stone-700"
              >
                {t.decline}
              </button>
              <button
                type="button"
                onClick={accept}
                className="rounded-full bg-[#0C2686] px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-white shadow-[0_4px_14px_-4px_rgba(12,38,134,0.55)] transition hover:bg-[#0a1f6b] hover:shadow-[0_6px_18px_-4px_rgba(12,38,134,0.65)] active:scale-[0.98]"
              >
                {t.accept}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
