import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Globe } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { useJournalLang } from '@/hooks/useJournalLang'

export default function CmsLoginPage() {
  const { t } = useTranslation()
  const { lang, setLang } = useJournalLang()
  const { user, loading, login } = useAuth()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const loginSchema = z.object({
    email: z.email(t('cms.login.emailInvalid')),
    password: z.string().min(8, t('cms.login.passwordMin')),
  })

  type LoginForm = z.infer<typeof loginSchema>

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  if (!loading && user) {
    if (user.emailVerified === false) {
      return <Navigate to="/cms/verify-email" replace />
    }
    const from = (location.state as { from?: string } | null)?.from || '/cms'
    return <Navigate to={from} replace />
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await login(values.email, values.password)
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : t('cms.login.failed'),
      )
    }
  })

  return (
    <div className="flex min-h-svh items-center justify-center bg-[#FAF8F3] px-4 font-sans text-stone-900">
      <div className="relative w-full max-w-md border border-[#E8E4DC] bg-white p-8 shadow-sm">
        <button
          type="button"
          onClick={() => setLang(lang === 'bg' ? 'en' : 'bg')}
          className="absolute right-4 top-4 flex items-center gap-1.5 rounded-xl border border-[#E8E4DC] px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-stone-600 hover:border-[#0C2686]/30 hover:text-[#0C2686]"
          title={t('cms.langToggle')}
        >
          <Globe className="size-3.5" />
          {lang.toUpperCase()}
        </button>

        <p className="text-xs font-semibold tracking-[0.18em] text-stone-500 uppercase">
          {t('cms.login.brand')}
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold text-[#0C2686]">
          {t('cms.login.title')}
        </h1>
        <p className="mt-2 text-sm text-stone-600">{t('cms.login.subtitle')}</p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit} noValidate>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-stone-700">
              {t('cms.login.email')}
            </span>
            <input
              type="email"
              autoComplete="email"
              className="w-full border border-[#E8E4DC] bg-[#FAF8F3] px-3 py-2.5 text-sm outline-none focus:border-[#0C2686]"
              {...register('email')}
            />
            {errors.email && (
              <span className="block text-xs text-red-700">{errors.email.message}</span>
            )}
          </label>

          <div className="space-y-1.5">
            <label
              htmlFor="cms-login-password"
              className="block text-sm font-medium text-stone-700"
            >
              {t('cms.login.password')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="w-full border border-[#E8E4DC] bg-[#FAF8F3] px-3 py-2.5 pr-11 text-sm outline-none focus:border-[#0C2686]"
                {...register('password')}
                id="cms-login-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-stone-400 transition hover:text-stone-700"
                aria-label={
                  showPassword
                    ? t('cms.login.hidePassword')
                    : t('cms.login.showPassword')
                }
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <span className="block text-xs text-red-700">
                {errors.password.message}
              </span>
            )}
          </div>

          {formError && (
            <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="w-full bg-[#0C2686] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a1f6c] disabled:opacity-60"
          >
            {isSubmitting || loading
              ? t('cms.login.submitting')
              : t('cms.login.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
