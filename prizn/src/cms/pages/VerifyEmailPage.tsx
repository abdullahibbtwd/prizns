import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Clock } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'

/** Matches the API's resend cooldown. */
const RESEND_COOLDOWN_SECONDS = 120

function formatWait(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function CmsVerifyEmailPage() {
  const { t } = useTranslation()
  const {
    user,
    loading,
    verifyEmail,
    resendVerification,
    verificationResendIn,
    logout,
  } = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendAt, setResendAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const waitSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000))
  const needsVerification = Boolean(user) && user?.emailVerified === false

  const startCooldown = (seconds: number) => {
    const at = Date.now()
    setNow(at)
    setResendAt(at + seconds * 1000)
  }

  useEffect(() => {
    if (!needsVerification) return
    let active = true
    verificationResendIn()
      .then((seconds) => {
        if (active) startCooldown(seconds)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per verification visit
  }, [needsVerification])

  useEffect(() => {
    if (waitSeconds <= 0) return
    const timer = window.setTimeout(() => setNow(Date.now()), 1000)
    return () => window.clearTimeout(timer)
  }, [waitSeconds, now])

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#FAF8F3] font-sans text-stone-600">
        Checking session…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/cms/login" replace />
  }

  if (user.emailVerified !== false) {
    return <Navigate to="/cms" replace />
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = code.replace(/\D/g, '').slice(0, 6)
    if (trimmed.length !== 6) {
      setFormError(t('cms.verify.invalid'))
      return
    }
    setFormError(null)
    setInfo(null)
    setSubmitting(true)
    try {
      await verifyEmail(trimmed)
      navigate('/cms', { replace: true })
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : t('cms.verify.invalid'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const onResend = async () => {
    setFormError(null)
    setInfo(null)
    setResending(true)
    try {
      startCooldown(await resendVerification())
      setInfo(t('cms.verify.resent'))
    } catch (error) {
      if (error instanceof ApiError && error.retryAfterSeconds) {
        startCooldown(error.retryAfterSeconds)
        return
      }
      setFormError(
        error instanceof ApiError ? error.message : t('cms.verify.resendFailed'),
      )
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-[#FAF8F3] px-4 font-sans text-stone-900">
      <div className="w-full max-w-md border border-[#E8E4DC] bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-stone-500 uppercase">
          {t('cms.login.brand')}
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold text-[#0C2686]">
          {t('cms.verify.title')}
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          {t('cms.verify.subtitle', { email: user.email })}
        </p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-stone-700">
              {t('cms.verify.code')}
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
              }
              className="w-full border border-[#E8E4DC] bg-[#FAF8F3] px-3 py-3 text-center font-heading text-2xl tracking-[0.4em] text-[#0C2686] outline-none focus:border-[#0C2686]"
            />
          </label>

          {formError && (
            <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {formError}
            </p>
          )}
          {info && (
            <p className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || code.length !== 6}
            className="w-full bg-[#0C2686] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a1f6c] disabled:opacity-60"
          >
            {submitting ? t('cms.verify.submitting') : t('cms.verify.submit')}
          </button>
        </form>

        {waitSeconds > 0 ? (
          <div
            role="timer"
            aria-live="polite"
            className="mt-6 border border-[#E8E4DC] bg-[#FAF8F3] px-4 py-3"
          >
            <p className="flex items-center gap-2 text-sm text-stone-700">
              <Clock className="size-4 shrink-0 text-[#0C2686]" />
              <span>
                {t('cms.verify.waitToResend')}{' '}
                <span className="font-semibold tabular-nums text-[#0C2686]">
                  {formatWait(waitSeconds)}
                </span>
              </span>
            </p>
            <div className="mt-2 h-1 overflow-hidden bg-[#E8E4DC]">
              <div
                className="h-full bg-[#0C2686] transition-[width] duration-1000 ease-linear"
                style={{
                  width: `${Math.min(100, (waitSeconds / RESEND_COOLDOWN_SECONDS) * 100)}%`,
                }}
              />
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => void onResend()}
            disabled={resending || waitSeconds > 0}
            className="font-semibold text-[#0C2686] hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
          >
            {resending
              ? t('cms.verify.submitting')
              : waitSeconds > 0
                ? t('cms.verify.resendIn', { time: formatWait(waitSeconds) })
                : t('cms.verify.resend')}
          </button>
          <button
            type="button"
            onClick={async () => {
              await logout()
              navigate('/cms/login', { replace: true })
            }}
            className="text-stone-500 hover:text-stone-800"
          >
            {t('cms.verify.signOut')}
          </button>
        </div>
      </div>
    </div>
  )
}
