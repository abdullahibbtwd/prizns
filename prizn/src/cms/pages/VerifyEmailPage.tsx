import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'

export default function CmsVerifyEmailPage() {
  const { t } = useTranslation()
  const { user, loading, verifyEmail, resendVerification, logout } = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)

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
      await resendVerification()
      setInfo(t('cms.verify.resent'))
    } catch (error) {
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

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => void onResend()}
            disabled={resending}
            className="font-semibold text-[#0C2686] hover:underline disabled:opacity-60"
          >
            {resending ? t('cms.verify.submitting') : t('cms.verify.resend')}
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
