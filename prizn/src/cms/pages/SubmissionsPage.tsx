import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
  StatusPill,
} from '@/cms/components/CmsUI'
import { JournalSelect } from '@/components/ui/JournalSelect'
import {
  listCmsSubmissions,
  type SubmissionStatus,
} from '@/lib/submissions-api'
import { cn } from '@/lib/utils'

const STATUS_FILTERS: Array<'all' | SubmissionStatus> = [
  'all',
  'new',
  'review',
  'changes',
  'approved',
  'rejected',
]

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100] as const
const BASE_PATH = '/cms/submissions'

export default function CmsSubmissionsPage() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    setPage(1)
  }, [status, debouncedQuery, pageSize])

  const listQuery = useQuery({
    queryKey: ['cms-submissions', page, pageSize, status, debouncedQuery],
    queryFn: () =>
      listCmsSubmissions({
        page,
        pageSize,
        q: debouncedQuery || undefined,
        status: status === 'all' ? undefined : status,
      }),
    placeholderData: (prev) => prev,
  })

  const items = listQuery.data?.items ?? []
  const total = listQuery.data?.total ?? 0
  const totalPages = listQuery.data?.totalPages ?? 1

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

  const statusLabel = (item: (typeof STATUS_FILTERS)[number]) =>
    item === 'all' ? t('cms.common.all') : t(`cms.status.${item}`)

  return (
    <div>
      <CmsPageHeader
        title={t('cms.submissions.title')}
        description={t('cms.submissions.description')}
        badge={t('cms.submissions.badge', { count: total })}
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('cms.submissions.searchPlaceholder')}
            className="w-full rounded-xl border border-[#E8E4DC] bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#0C2686]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStatus(item)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors',
                status === item
                  ? 'border-[#0C2686] bg-[#0C2686] text-white'
                  : 'border-[#E8E4DC] bg-white text-stone-600 hover:border-[#0C2686]/40',
              )}
            >
              {statusLabel(item)}
            </button>
          ))}
        </div>
      </div>

      {listQuery.isLoading && (
        <CmsCard className="p-8 text-sm text-stone-600">
          {t('cms.submissions.loading')}
        </CmsCard>
      )}

      {listQuery.isError && (
        <CmsCard className="p-8 text-sm text-rose-700">
          {t('cms.submissions.loadFailed')} {(listQuery.error as Error).message}
        </CmsCard>
      )}

      {!listQuery.isLoading && !listQuery.isError && total === 0 && !debouncedQuery && status === 'all' && (
        <CmsCard className="p-8 text-sm text-stone-600">
          {t('cms.submissions.empty')}
        </CmsCard>
      )}

      {!listQuery.isLoading && !listQuery.isError && total === 0 && (debouncedQuery || status !== 'all') && (
        <CmsCard className="p-8 text-sm text-stone-600">
          {t('cms.submissions.emptyFiltered')}
        </CmsCard>
      )}

      {items.length > 0 && (
        <CmsCard hover={false} className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-[#E8E4DC] bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">{t('cms.submissions.colTitle')}</th>
                  <th className="px-4 py-3">{t('cms.submissions.colAuthor')}</th>
                  <th className="px-4 py-3">{t('cms.submissions.colPlace')}</th>
                  <th className="px-4 py-3">{t('cms.submissions.colCategory')}</th>
                  <th className="px-4 py-3">{t('cms.submissions.colStatus')}</th>
                  <th className="px-4 py-3">{t('cms.submissions.colSubmitted')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[#E8E4DC]/70 transition-colors hover:bg-stone-50/80"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image}
                          alt=""
                          className="size-10 shrink-0 rounded-lg border border-stone-200 object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-stone-900">{item.title}</p>
                          <p className="truncate text-xs text-stone-500">{item.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-stone-800">{item.name}</td>
                    <td className="px-4 py-3 text-stone-600">{item.village}</td>
                    <td className="px-4 py-3 text-stone-600">{item.category}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-stone-500">{item.submittedAt}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`${BASE_PATH}/${item.id}`}
                        className="font-semibold text-[#0C2686] hover:underline"
                      >
                        {t('cms.common.open')}
                      </Link>
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

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-[140px] items-center gap-3">
              <span className="shrink-0 text-xs font-medium text-stone-600">
                {t('cms.common.perPage')}
              </span>
              <JournalSelect
                name="submissionsPageSize"
                variant="boxed"
                value={String(pageSize)}
                onChange={(value) =>
                  setPageSize(
                    Number(value) as (typeof PAGE_SIZE_OPTIONS)[number],
                  )
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
    </div>
  )
}
