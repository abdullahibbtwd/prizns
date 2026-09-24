import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { Link } from '@/components/LocaleLink'
import type { JournalLang } from '@/components/concept-3/JournalShell'
import { getPublicSeries } from '@/lib/public-content'
import { pickLang } from '@/lib/pick-lang'

type SeriesMeta = {
  id: string
  slug?: string
  title: string
  titleBg: string
  episodeNumber: number
}

/**
 * Continuation teaser for multi-part series.
 * Renders only when a next published episode exists — never dangling copy.
 */
export function SeriesContinue({
  series,
  currentSlug,
  lang,
}: {
  series: SeriesMeta | null | undefined
  currentSlug: string
  lang: JournalLang
}) {
  const { t } = useTranslation()
  const seriesSlug = series?.slug?.trim() || ''

  const seriesQuery = useQuery({
    queryKey: ['public-series', seriesSlug],
    queryFn: () => getPublicSeries(seriesSlug),
    enabled: Boolean(seriesSlug),
  })

  if (!series || !seriesSlug) return null

  const episodes = seriesQuery.data?.episodes ?? []
  const index = episodes.findIndex(
    (ep) => ep.slug === currentSlug || ep.path.endsWith(`/${currentSlug}`),
  )
  const next = index >= 0 ? episodes[index + 1] : undefined
  const prev = index > 0 ? episodes[index - 1] : undefined

  // Only the continuation teaser when a next episode exists; previous is optional.
  if (!next) return null

  const nextTitle = pickLang(lang, next.title, next.titleBg)
  const prevTitle = prev
    ? pickLang(lang, prev.title, prev.titleBg)
    : ''

  return (
    <aside
      className="mt-14 rounded-[16px] border border-[#EAE6DF] bg-white px-6 py-6 md:px-8 print-hidden"
      data-print-hide
    >
      <div>
        <p className="mb-2 font-sans text-[11px] font-medium uppercase tracking-[0.22em] text-[#0C2686]">
          {t('seriesContinue')}
        </p>
        <Link
          to={next.path}
          className="group inline-flex max-w-full items-center gap-2 font-heading text-xl text-[#1A1A1A] transition-colors hover:text-[#0C2686] md:text-2xl"
        >
          <span className="min-w-0">
            {t('seriesContinueEpisode', {
              n: next.sortOrder + 1,
              title: nextTitle,
            })}
          </span>
          <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {prev ? (
        <div className="mt-5 border-t border-[#EAE6DF] pt-5">
          <Link
            to={prev.path}
            className="font-sans text-sm text-[#1A1A1A]/60 transition-colors hover:text-[#0C2686]"
          >
            {t('seriesPreviousEpisode', {
              n: prev.sortOrder + 1,
              title: prevTitle,
            })}
          </Link>
        </div>
      ) : null}
    </aside>
  )
}
