import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useReaderAuth } from '@/lib/reader-auth'
import { useJournalLang } from '@/hooks/useJournalLang'

export function ReaderSignInModal() {
  const { t } = useTranslation()
  const { lang } = useJournalLang()
  const navigate = useNavigate()
  const { enabled, modalOpen, closeSignIn, requestLink } = useReaderAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<
    'idle' | 'sending' | 'sent' | 'signedIn' | 'error'
  >('idle')
  const [error, setError] = useState<string | null>(null)

  if (!enabled || !modalOpen) return null

  const handleClose = () => {
    setStatus('idle')
    setError(null)
    setEmail('')
    closeSignIn()
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setStatus('sending')
    setError(null)
    try {
      const result = await requestLink(email.trim(), lang)
      if (result.authenticated) {
        setStatus('signedIn')
        const target =
          result.returnUrl && result.returnUrl.startsWith('/')
            ? result.returnUrl
            : null
        window.setTimeout(() => {
          handleClose()
          if (target && target !== window.location.pathname) {
            navigate(target)
          }
        }, 700)
        return
      }
      setStatus('sent')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : t('readerSignInError'))
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer"
        aria-label={t('close')}
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reader-signin-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-[#EAE6DF] bg-[#FDFBF7] p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-[#1A1A1A]/50 transition-colors hover:bg-black/5 hover:text-[#0C2686]"
          aria-label={t('close')}
        >
          <X className="size-4" />
        </button>

        <h2
          id="reader-signin-title"
          className="font-heading text-2xl text-[#0C2686]"
        >
          {t('readerSignInTitle')}
        </h2>
        <p className="mt-2 font-sans text-sm leading-relaxed text-[#1A1A1A]/70">
          {t('readerSignInBody')}
        </p>

        {status === 'sent' ? (
          <p className="mt-6 rounded-xl bg-[#0C2686]/5 px-4 py-3 font-sans text-sm text-[#0C2686]">
            {t('readerSignInSent')}
          </p>
        ) : status === 'signedIn' ? (
          <p className="mt-6 rounded-xl bg-[#0C2686]/5 px-4 py-3 font-sans text-sm text-[#0C2686]">
            {t('readerSignInWelcomeBack')}
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block font-sans text-xs uppercase tracking-widest text-[#1A1A1A]/50">
              {t('readerEmailLabel')}
              <input
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#EAE6DF] bg-white px-4 py-3 font-sans text-sm text-[#1A1A1A] outline-none transition focus:border-[#0C2686]"
                placeholder="you@email.com"
              />
            </label>
            {error && (
              <p className="font-sans text-sm text-rose-700">{error}</p>
            )}
            <button
              type="submit"
              disabled={status === 'sending' || !email.trim()}
              className="w-full cursor-pointer rounded-full bg-[#0C2686] px-5 py-3 font-sans text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#0a1f6b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === 'sending'
                ? t('readerSignInSending')
                : t('readerSignInSubmit')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
