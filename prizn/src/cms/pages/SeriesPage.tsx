import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Layers, Plus, Trash2 } from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
  PrimaryButton,
  StatusPill,
} from '@/cms/components/CmsUI'
import { useCmsConfirm } from '@/cms/components/CmsConfirmDialog'
import { deleteCmsSeries, listCmsSeries } from '@/lib/cms-content-api'
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
  const queryClient = useQueryClient()
  const { confirm, dialog } = useCmsConfirm()
  const seriesQuery = useQuery({
    queryKey: ['cms-series'],
    queryFn: listCmsSeries,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCmsSeries(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cms-series'] })
      await queryClient.invalidateQueries({ queryKey: ['cms-series-count'] })
    },
  })

  const confirmDelete = async (item: CmsSeries) => {
    const title = pickLang(lang, item.titleEn, item.titleBg) || item.titleBg
    const ok = await confirm({
      title: t('cms.series.delete'),
      description: t('cms.series.deleteConfirm', { title }),
    })
    if (!ok) return
    deleteMutation.mutate(item.id)
  }

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
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => void confirmDelete(item)}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 disabled:opacity-50"
              >
                <Trash2 className="size-3.5" />
                {deleteMutation.isPending
                  ? t('cms.series.deleting')
                  : t('cms.series.delete')}
              </button>
              <Link to={`/cms/series/${item.id}`} className="shrink-0">
                <PrimaryButton className="py-2 text-xs">
                  {t('cms.series.manage')}
                </PrimaryButton>
              </Link>
            </div>
          </CmsCard>
        ))}
      </div>
      {dialog}
    </div>
  )
}
