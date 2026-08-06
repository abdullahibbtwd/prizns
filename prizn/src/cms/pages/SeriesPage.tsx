import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Layers, Plus } from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
  PrimaryButton,
  StatusPill,
} from '@/cms/components/CmsUI'
import { listCmsSeries } from '@/lib/cms-content-api'
import { useJournalLang } from '@/hooks/useJournalLang'
import { pickLang } from '@/lib/pick-lang'
import type { CmsSeries } from '@/lib/cms-types'

function statsLine(
  item: CmsSeries,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  const stats = item.episodeStats
  const total = stats?.total ?? item._count?.episodes ?? item.episodes.length
  const parts: string[] = [t('cms.series.episodeCount', { count: total })]

  if (stats) {
    if (stats.published)
      parts.push(t('cms.series.publishedCount', { count: stats.published }))
    if (stats.draft)
      parts.push(t('cms.series.draftCount', { count: stats.draft }))
    if (stats.scheduled)
      parts.push(t('cms.series.scheduledCount', { count: stats.scheduled }))
    if (stats.review)
      parts.push(t('cms.series.reviewCount', { count: stats.review }))
    if (stats.archived)
      parts.push(t('cms.series.archivedCount', { count: stats.archived }))
  }

  return parts.join(' · ')
}

export default function CmsSeriesPage() {
  const { t } = useTranslation()
  const { lang } = useJournalLang()
  const seriesQuery = useQuery({
    queryKey: ['cms-series'],
    queryFn: listCmsSeries,
  })

  const series = seriesQuery.data ?? []

  return (
    <div>
      <CmsPageHeader
        title={t('cms.series.title')}
        description={t('cms.series.description')}
        badge={t('cms.series.items', { count: series.length })}
        actions={
          <Link to="/cms/series/new">
            <PrimaryButton>
              <Plus className="size-4" />
              {t('cms.series.newSeries')}
            </PrimaryButton>
          </Link>
        }
      />

      {seriesQuery.isLoading && (
        <p className="text-sm text-stone-500">{t('cms.series.loading')}</p>
      )}
      {seriesQuery.isError && (
        <p className="text-sm text-rose-700">{t('cms.series.loadFailed')}</p>
      )}

      {!seriesQuery.isLoading && series.length === 0 && (
        <CmsCard className="p-8 text-center text-sm text-stone-500">
          {t('cms.series.empty')}{' '}
          <Link to="/cms/series/new" className="font-semibold text-[#0C2686]">
            {t('cms.series.createFirst')}
          </Link>
        </CmsCard>
      )}

      <div className="space-y-4">
        {series.map((item) => (
          <CmsCard
            key={item.id}
            className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#0C2686]/10 text-[#0C2686]">
                <Layers className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h2 className="font-heading text-xl font-bold text-stone-900">
                    {pickLang(lang, item.titleEn, item.titleBg)}
                  </h2>
                  <StatusPill status={item.status} />
                </div>
                <p className="text-sm text-stone-600">
                  {statsLine(item, (key, opts) => String(t(key, opts)))}
                </p>
              </div>
            </div>
            <Link to={`/cms/series/${item.id}`} className="shrink-0">
              <PrimaryButton className="py-2 text-xs">
                {t('cms.series.manage')}
              </PrimaryButton>
            </Link>
          </CmsCard>
        ))}
      </div>
    </div>
  )
}
