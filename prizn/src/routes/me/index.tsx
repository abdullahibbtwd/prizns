import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Bookmark, LogOut } from 'lucide-react'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { PageMeta } from '@/components/PageMeta'
import { useReaderAuth } from '@/lib/reader-auth'
import { listSavedArticles } from '@/lib/reader-api'

function pick(lang: 'bg' | 'en', en: string | null | undefined, bg: string) {
  return lang === 'bg' ? bg : en || bg
}

export default function ReaderMePage() {
  const { t } = useTranslation()
  const { reader, loading, enabled, openSignIn, logout } = useReaderAuth()

  const savesQuery = useQuery({
    queryKey: ['reader-saves', reader?.id],
    queryFn: listSavedArticles,
    enabled: Boolean(reader),
  })

  return (
    <JournalShell navVariant="solid">
      {({ lang }) => (
        <>
          <PageMeta
            title={t('readerSavedTitle')}
            description={t('readerSavedEmpty')}
            path="/me"
            lang={lang}
            noIndex
          />
          <div className="mx-auto max-w-3xl px-6 py-16 md:px-12 md:py-24">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#EAE6DF] pb-8">
              <div>
                <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-[#0C2686]/70">
                  {t('readerProfileEyebrow')}
                </p>
                <h1 className="mt-2 font-heading text-4xl text-[#0C2686] md:text-5xl">
                  {t('readerSavedTitle')}
                </h1>
                {reader && (
                  <p className="mt-3 font-sans text-sm text-[#1A1A1A]/60">
                    {reader.email}
                  </p>
                )}
              </div>
              {reader && (
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/10 px-4 py-2 font-sans text-[11px] uppercase tracking-widest text-[#1A1A1A]/70 transition hover:border-[#0C2686] hover:text-[#0C2686]"
                >
                  <LogOut className="size-3.5" />
                  {t('readerSignOut')}
                </button>
              )}
            </div>

            {!enabled && (
              <p className="mt-10 font-sans text-sm text-[#1A1A1A]/70">
                {t('readerAuthDisabled')}
              </p>
            )}

            {enabled && loading && (
              <p className="mt-10 font-sans text-sm text-[#1A1A1A]/60">
                {t('readerLoading')}
              </p>
            )}

            {enabled && !loading && !reader && (
              <div className="mt-10 rounded-2xl border border-[#EAE6DF] bg-white/50 p-8 text-center">
                <Bookmark className="mx-auto size-8 text-[#0C2686]/40" />
                <p className="mt-4 font-sans text-sm text-[#1A1A1A]/70">
                  {t('readerSignInToSave')}
                </p>
                <button
                  type="button"
                  onClick={() => openSignIn({ returnUrl: '/me' })}
                  className="mt-6 cursor-pointer rounded-full bg-[#0C2686] px-5 py-3 font-sans text-xs font-semibold uppercase tracking-[0.18em] text-white"
                >
                  {t('readerSignInSubmit')}
                </button>
              </div>
            )}

            {reader && (
              <div className="mt-10 space-y-4">
                {savesQuery.isLoading && (
                  <p className="font-sans text-sm text-[#1A1A1A]/60">
                    {t('readerLoading')}
                  </p>
                )}
                {savesQuery.isError && (
                  <p className="font-sans text-sm text-rose-700">
                    {(savesQuery.error as Error).message}
                  </p>
                )}
                {(savesQuery.data ?? []).length === 0 &&
                  !savesQuery.isLoading && (
                    <p className="font-sans text-sm text-[#1A1A1A]/60">
                      {t('readerSavedEmpty')}
                    </p>
                  )}
                {(savesQuery.data ?? []).map((row) => (
                  <Link
                    key={row.id}
                    to={row.article.path}
                    className="group flex gap-4 rounded-2xl border border-[#EAE6DF] bg-white/40 p-3 transition hover:border-[#0C2686]/30"
                  >
                    {row.article.heroUrl ? (
                      <img
                        src={row.article.heroUrl}
                        alt=""
                        loading="lazy"
                        className="h-20 w-24 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-24 shrink-0 items-center justify-center rounded-xl bg-[#0C2686]/5">
                        <Bookmark className="size-5 text-[#0C2686]/40" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 py-1">
                      <p className="font-sans text-[10px] uppercase tracking-widest text-[#0C2686]/70">
                        {pick(
                          lang,
                          row.article.categoryEn,
                          row.article.categoryBg,
                        )}
                      </p>
                      <h2 className="mt-1 truncate font-heading text-xl text-[#1A1A1A] group-hover:text-[#0C2686]">
                        {pick(lang, row.article.titleEn, row.article.titleBg)}
                      </h2>
                      <p className="mt-1 truncate font-sans text-xs text-[#1A1A1A]/50">
                        {pick(
                          lang,
                          row.article.locationEn,
                          row.article.locationBg,
                        )}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </JournalShell>
  )
}
