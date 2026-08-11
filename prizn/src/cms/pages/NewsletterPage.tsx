import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
  BookOpen,
  Mail,
  TrendingUp,
  Send,
  Radio,
} from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
  PrimaryButton,
  StatCard,
  StatusPill,
} from '@/cms/components/CmsUI'
import { JournalSelect } from '@/components/ui/JournalSelect'
import { Alert } from '@/components/ui/Alert'
import {
  deleteCmsNewsletterSubscriber,
  listCmsNewsletterSubscribers,
} from '@/lib/newsletter-api'
import {
  getCmsDigestPreview,
  listCmsDigestHistory,
  sendCmsDigest,
} from '@/lib/digest-api'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100] as const

export default function CmsNewsletterPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10)
  const [toast, setToast] = useState<{
    open: boolean
    variant: 'success' | 'error'
    message: string
  }>({ open: false, variant: 'success', message: '' })

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    setPage(1)
  }, [debouncedQuery, pageSize])

  const listQuery = useQuery({
    queryKey: ['cms-newsletter-subscribers', page, pageSize, debouncedQuery],
    queryFn: () =>
      listCmsNewsletterSubscribers({
        page,
        pageSize,
        q: debouncedQuery || undefined,
      }),
    placeholderData: (prev) => prev,
  })

  const previewQuery = useQuery({
    queryKey: ['cms-digest-preview'],
    queryFn: () => getCmsDigestPreview(),
  })

  const historyQuery = useQuery({
    queryKey: ['cms-digest-history'],
    queryFn: () => listCmsDigestHistory(),
  })

  const sendMutation = useMutation({
    mutationFn: () => {
      const next = previewQuery.data?.next
      if (!next) throw new Error('No episode to send')
      return sendCmsDigest({
        seriesId: next.seriesId,
        articleId: next.articleId,
      })
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['cms-digest-preview'] }),
        queryClient.invalidateQueries({ queryKey: ['cms-digest-history'] }),
      ])
      setToast({
        open: true,
        variant: 'success',
        message: t('cms.newsletter.sentOk', { count: result.recipientCount }),
      })
    },
    onError: (err: Error) => {
      setToast({
        open: true,
        variant: 'error',
        message: (err as ApiError)?.message || err.message || t('cms.newsletter.sendFailed'),
      })
    },
  })

  const items = listQuery.data?.items ?? []
  const total = listQuery.data?.total ?? 0
  const totalPages = listQuery.data?.totalPages ?? 1
  const totalLabel = total.toLocaleString()
  const nextEpisode = previewQuery.data?.next
  const history = historyQuery.data ?? []
  const subscriberCount = previewQuery.data?.subscriberCount ?? 0

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const pageNumbers = useMemo(() => {
    const maxButtons = 5
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const half = Math.floor(maxButtons / 2)
    let start = Math.max(1, page - half)
    const end = Math.min(totalPages, start + maxButtons - 1)
    start = Math.max(1, end - maxButtons + 1)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [page, totalPages])

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCmsNewsletterSubscriber(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['cms-newsletter-subscribers'] }),
        queryClient.invalidateQueries({ queryKey: ['cms-newsletter-count'] }),
      ])
      setToast({
        open: true,
        variant: 'success',
        message: t('cms.newsletter.removed'),
      })
    },
    onError: (err: Error) => {
      setToast({
        open: true,
        variant: 'error',
        message: err.message || t('cms.newsletter.removeFailed'),
      })
    },
  })

  return (
    <div>
      <CmsPageHeader
        title={t('cms.newsletter.title')}
        description={t('cms.newsletter.description')}
        badge={t('cms.newsletter.badge', { count: totalLabel })}
      />

      <CmsCard className="mb-8 space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Radio className="size-4 text-[#0C2686]" />
          <h2 className="text-sm font-semibold">{t('cms.newsletter.episodeTitle')}</h2>
        </div>
        <p className="text-xs text-stone-500">
          {t('cms.newsletter.episodeHint')}
        </p>

        {previewQuery.isLoading ? (
          <p className="text-sm text-stone-500">{t('cms.newsletter.loadingEpisode')}</p>
        ) : !nextEpisode ? (
          <p className="text-sm text-stone-500">
            {t('cms.newsletter.noEpisode')}
          </p>
        ) : (
          <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F3] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0C2686]">
              {nextEpisode.seriesTitleBg} · Episode {nextEpisode.episodeNumber}
            </p>
            <h3 className="mt-1 font-heading text-xl text-stone-900">
              {nextEpisode.titleBg}
            </h3>
            {nextEpisode.subtitleBg ? (
              <p className="mt-1 text-sm text-stone-600">{nextEpisode.subtitleBg}</p>
            ) : null}
            <p className="mt-2 text-xs text-stone-500">{nextEpisode.path}</p>
            <p className="mt-3 text-xs text-stone-500">
              {subscriberCount === 1
                ? t('cms.newsletter.subscriberOne', { count: subscriberCount })
                : t('cms.newsletter.subscribers', { count: subscriberCount })}
              {previewQuery.data?.mailConfigured === false
                ? ` · ${t('cms.newsletter.resendMissing')}`
                : ''}
            </p>
            <div className="mt-4">
              <PrimaryButton
                type="button"
                disabled={
                  sendMutation.isPending ||
                  subscriberCount < 1 ||
                  previewQuery.data?.mailConfigured === false
                }
                onClick={() => {
                  if (
                    window.confirm(
                      t('cms.newsletter.sendConfirm', {
                        title: nextEpisode.titleBg,
                        count: subscriberCount,
                      }),
                    )
                  ) {
                    sendMutation.mutate()
                  }
                }}
              >
                <Send className="size-3.5" />
                {sendMutation.isPending
                  ? t('cms.newsletter.sending')
                  : t('cms.newsletter.sendNow')}
              </PrimaryButton>
            </div>
          </div>
        )}

        {history.length > 0 ? (
          <div className="space-y-2 border-t border-[#E8E4DC] pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              {t('cms.newsletter.recentSends')}
            </p>
            {history.slice(0, 8).map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E8E4DC] bg-white px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-900">
                    {item.article.titleBg}
                  </p>
                  <p className="text-[11px] text-stone-500">
                    {item.series.titleBg} ·{' '}
                    {t('cms.newsletter.recipients', {
                      count: item.recipientCount,
                    })}{' '}
                    · {new Date(item.sentAt).toLocaleString()}
                  </p>
                </div>
                <StatusPill status={item.status} />
              </div>
            ))}
          </div>
        ) : null}
      </CmsCard>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title={t('cms.newsletter.statSubscribers')}
          value={totalLabel}
          trend="0%"
          trendType="neutral"
          icon={Mail}
          sparklineData={[0, 0, 0, 0, 0]}
        />
        <StatCard
          title={t('cms.newsletter.statDigests')}
          value={String(history.filter((h) => h.status === 'SENT').length)}
          trend={t('cms.newsletter.episodeTitle')}
          trendType="neutral"
          icon={BookOpen}
          sparklineData={[0, 0, 0, 0]}
        />
        <StatCard
          title={t('cms.newsletter.statOpenRate')}
          value="—"
          trend={t('cms.newsletter.statOpenHint')}
          trendType="neutral"
          icon={TrendingUp}
          sparklineData={[0, 0, 0, 0]}
        />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('cms.newsletter.searchPlaceholder')}
            className="w-full rounded-xl border border-[#E8E4DC] bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#0C2686]"
          />
        </div>
      </div>

      {listQuery.isLoading && (
        <CmsCard className="p-8 text-sm text-stone-600">
          {t('cms.newsletter.loading')}
        </CmsCard>
      )}

      {listQuery.isError && (
        <CmsCard className="p-8 text-sm text-rose-700">
          {t('cms.newsletter.loadFailed')} {(listQuery.error as Error).message}
        </CmsCard>
      )}

      {!listQuery.isLoading && !listQuery.isError && total === 0 && !debouncedQuery && (
        <CmsCard className="p-8 text-sm text-stone-600">
          {t('cms.newsletter.empty')}
        </CmsCard>
      )}

      {!listQuery.isLoading && !listQuery.isError && total === 0 && Boolean(debouncedQuery) && (
        <CmsCard className="p-8 text-sm text-stone-600">
          {t('cms.newsletter.empty')}
        </CmsCard>
      )}

      {items.length > 0 && (
        <CmsCard hover={false} className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-[#E8E4DC] bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">{t('cms.newsletter.colEmail')}</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">{t('cms.newsletter.colJoined')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[#E8E4DC]/70 transition-colors hover:bg-stone-50/80"
                  >
                    <td className="px-4 py-3 font-medium text-stone-900">{item.email}</td>
                    <td className="px-4 py-3 capitalize text-stone-600">
                      {item.source || 'website'}
                    </td>
                    <td className="px-4 py-3 text-stone-500">{item.subscribedAt}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              t('cms.newsletter.removeConfirm', {
                                email: item.email,
                              }),
                            )
                          ) {
                            deleteMutation.mutate(item.id)
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                      >
                        <Trash2 className="size-3.5" />
                        {t('cms.newsletter.remove')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CmsCard>
      )}

      {total > 0 && (
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-[#E8E4DC] bg-white px-4 py-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-stone-600">
            {t('cms.common.showing', { from, to, total })}
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex min-w-[140px] items-center gap-3">
              <span className="shrink-0 text-xs font-medium text-stone-600">
                {t('cms.common.perPage')}
              </span>
              <JournalSelect
                name="pageSize"
                value={String(pageSize)}
                onChange={(value) =>
                  setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number])
                }
                options={PAGE_SIZE_OPTIONS.map((size) => ({
                  value: String(size),
                  label: String(size),
                }))}
                className="min-w-[88px] flex-1"
              />
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || listQuery.isFetching}
                className="inline-flex items-center gap-1 rounded-xl border border-[#E8E4DC] bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="size-3.5" />
                {t('cms.common.prev')}
              </button>

              {pageNumbers.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPage(num)}
                  disabled={listQuery.isFetching}
                  className={cn(
                    'min-w-8 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-colors',
                    num === page
                      ? 'bg-[#0C2686] text-white shadow-xs'
                      : 'border border-[#E8E4DC] bg-stone-50 text-stone-700 hover:bg-white',
                  )}
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || listQuery.isFetching}
                className="inline-flex items-center gap-1 rounded-xl border border-[#E8E4DC] bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t('cms.common.next')}
                <ChevronRight className="size-3.5" />
              </button>
            </div>

            <p className="text-xs font-medium text-stone-500">
              {t('cms.common.pageOf', { page, totalPages })}
            </p>
          </div>
        </div>
      )}

      <Alert
        open={toast.open}
        variant={toast.variant}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </div>
  )
}
