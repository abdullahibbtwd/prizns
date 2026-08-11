import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { PageMeta } from '@/components/PageMeta'
import { useReaderAuth } from '@/lib/reader-auth'
import { saveArticle, verifyMagicLink } from '@/lib/reader-api'

/** Survives React StrictMode remounts in dev (refs reset on remount). */
const startedTokens = new Set<string>()

export default function AuthVerifyPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { setReader, enabled } = useReaderAuth()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'working' | 'done' | 'error'>('working')

  useEffect(() => {
    if (!enabled) {
      setStatus('error')
      setError(t('readerAuthDisabled'))
      return
    }

    const token = params.get('token')?.trim()
    if (!token) {
      setStatus('error')
      setError(t('readerVerifyMissing'))
      return
    }

    if (startedTokens.has(token)) return
    startedTokens.add(token)

    ;(async () => {
      try {
        const result = await verifyMagicLink(token)
        setReader(result.reader)

        if (result.intent?.type === 'save' && result.intent.articleId) {
          try {
            await saveArticle(result.intent.articleId)
          } catch {
            // Session is valid even if save fails; user can retry on article.
          }
        }

        setStatus('done')
        const target =
          result.returnUrl && result.returnUrl.startsWith('/')
            ? result.returnUrl
            : '/me'
        window.setTimeout(() => {
          navigate(target, { replace: true })
        }, 600)
      } catch (err) {
        startedTokens.delete(token)
        setStatus('error')
        setError(
          err instanceof Error ? err.message : t('readerVerifyFailed'),
        )
      }
    })()
  }, [enabled, navigate, params, setReader, t])

  return (
    <JournalShell navVariant="solid">
      {({ lang }) => (
        <>
          <PageMeta
            title={t('readerVerifyTitle')}
            description={t('readerSignInBody')}
            path="/auth/verify"
            lang={lang}
            noIndex
          />
          <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-6 py-24 text-center">
            <h1 className="font-heading text-3xl text-[#0C2686]">
              {t('readerVerifyTitle')}
            </h1>
            {status === 'working' && (
              <p className="mt-4 font-sans text-sm text-[#1A1A1A]/70">
                {t('readerVerifyWorking')}
              </p>
            )}
            {status === 'done' && (
              <p className="mt-4 font-sans text-sm text-[#0C2686]">
                {t('readerVerifyDone')}
              </p>
            )}
            {status === 'error' && (
              <>
                <p className="mt-4 font-sans text-sm text-rose-700">{error}</p>
                <Link
                  to="/"
                  className="mt-6 font-sans text-xs uppercase tracking-widest text-[#0C2686] underline"
                >
                  {t('backHome')}
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </JournalShell>
  )
}
