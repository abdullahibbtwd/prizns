import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Search, Trash2, BookOpen, Mail, TrendingUp } from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
  StatCard,
} from '@/cms/components/CmsUI'
import { JournalSelect } from '@/components/ui/JournalSelect'
import { Alert } from '@/components/ui/Alert'
import {
  deleteCmsNewsletterSubscriber,
  listCmsNewsletterSubscribers,
} from '@/lib/newsletter-api'
import { cn } from '@/lib/utils'

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100] as const

export default function CmsNewsletterPage() {
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

  const items = listQuery.data?.items ?? []
  const total = listQuery.data?.total ?? 0
  const totalPages = listQuery.data?.totalPages ?? 1
  const totalLabel = total.toLocaleString()

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
        message: 'Subscriber removed.',
      })
    },
    onError: (err: Error) => {
      setToast({
        open: true,
        variant: 'error',
        message: err.message || 'Failed to remove subscriber.',
      })
    },
  })

  return (
    <div>
      <CmsPageHeader
        title="Newsletter Hub"
        description="Subscribers who signed up from the public newsletter form."
        badge={`${totalLabel} Readers`}
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Active Subscribers"
          value={totalLabel}
          trend="0%"
          trendType="neutral"
          icon={Mail}
          sparklineData={[0, 0, 0, 0, 0]}
        />
        <StatCard
          title="Recent Campaigns"
          value="0 Sent"
          trend="0% Delivered"
          trendType="neutral"
          icon={BookOpen}
          sparklineData={[0, 0, 0, 0]}
        />
        <StatCard
          title="Average Open Rate"
          value="0%"
          trend="0%"
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
            placeholder="Search by email…"
            className="w-full rounded-xl border border-[#E8E4DC] bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#0C2686]"
          />
        </div>
      </div>

      {listQuery.isLoading && (
        <CmsCard className="p-8 text-sm text-stone-600">Loading subscribers…</CmsCard>
      )}

      {listQuery.isError && (
        <CmsCard className="p-8 text-sm text-rose-700">
          Failed to load subscribers. {(listQuery.error as Error).message}
        </CmsCard>
      )}

      {!listQuery.isLoading && !listQuery.isError && total === 0 && !debouncedQuery && (
        <CmsCard className="p-8 text-sm text-stone-600">
          No subscribers yet. Emails from the homepage newsletter form will appear here.
        </CmsCard>
      )}

      {!listQuery.isLoading && !listQuery.isError && total === 0 && Boolean(debouncedQuery) && (
        <CmsCard className="p-8 text-sm text-stone-600">
          No subscribers match your search.
        </CmsCard>
      )}

      {items.length > 0 && (
        <CmsCard hover={false} className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-[#E8E4DC] bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Subscribed</th>
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
                          if (window.confirm(`Remove ${item.email}?`)) {
                            deleteMutation.mutate(item.id)
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                      >
                        <Trash2 className="size-3.5" />
                        Remove
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
            Showing {from}–{to} of {total}
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex min-w-[140px] items-center gap-3">
              <span className="shrink-0 text-xs font-medium text-stone-600">Per page</span>
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
                Prev
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
                Next
                <ChevronRight className="size-3.5" />
              </button>
            </div>

            <p className="text-xs font-medium text-stone-500">
              Page {page} of {totalPages}
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
