import { useTranslation } from 'react-i18next'

/** First focusable control — visually hidden until keyboard focus. */
export function SkipToContent() {
  const { t } = useTranslation()
  return (
    <a
      href="#main-content"
      className="fixed left-4 top-4 z-[100] -translate-y-[calc(100%+2rem)] rounded-full bg-[#0C2686] px-4 py-2.5 font-sans text-xs font-medium uppercase tracking-[0.18em] text-white shadow-lg outline-none transition-transform focus:translate-y-0 focus-visible:ring-2 focus-visible:ring-[#0C2686]/40 focus-visible:ring-offset-2"
    >
      {t('skipToContent')}
    </a>
  )
}
