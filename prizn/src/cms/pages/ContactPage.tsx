import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Sparkles,
} from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
  StatusPill,
} from '@/cms/components/CmsUI'
import { CmsModal } from '@/cms/components/CmsModal'
import { JournalSelect } from '@/components/ui/JournalSelect'
import {
  listCmsContact,
  type ContactCategory,
  type ContactStatus,
} from '@/lib/contact-api'
import { contactCategoryLabel } from '@/cms/pages/contact-labels'
import { cn } from '@/lib/utils'

const STATUS_FILTERS: Array<'all' | ContactStatus> = [
  'all',
  'NEW',
  'REVIEW',
  'REPLIED',
  'CLOSED',
]

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const
const BASE_PATH = '/cms/contact'
const AI_PREVIEW_LEN = 48

function AiCell({ summary }: { summary: string | null }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  if (!summary?.trim()) {
    return <span className="text-stone-400">—</span>
  }
  const trimmed = summary.trim()
  const long = trimmed.length > AI_PREVIEW_LEN

  if (!long) {
    return (
      <p className="max-w-[14rem] text-xs italic leading-snug text-stone-600">
        {trimmed}
      </p>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#0C2686]/20 bg-[#0C2686]/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#0C2686] transition hover:bg-[#0C2686]/10"
        title={t('cms.contactDesk.aiView')}
      >
        <Sparkles className="size-3" />
        AI
      </button>
      <CmsModal
        open={open}
        onClose={() => setOpen(false)}
        title={t('cms.contactDesk.aiTitle')}
        description={t('cms.contactDesk.aiDescription')}
        size="sm"
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
          {trimmed}
        </p>
      </CmsModal>
    </>
  )
}

export default function CmsContactPage() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] =
    useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    setPage(1)
  }, [status, debouncedQuery, pageSize])

  const listQuery = useQuery({
    queryKey: ['cms-contact', page, pageSize, status, debouncedQuery],
    queryFn: () =>
      listCmsContact({
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

  return (
    <div>
      <CmsPageHeader
        title={t('cms.contactDesk.title')}
        description={t('cms.contactDesk.description')}
        badge={t('cms.contactDesk.badge', { count: total })}
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('cms.contactDesk.searchPlaceholder')}
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
              {item === 'all'
                ? t('cms.common.all')
                : t(`cms.status.${item.toLowerCase()}`)}
            </button>
          ))}
        </div>
      </div>

      {listQuery.isLoading && (
        <CmsCard className="p-8 text-sm text-stone-600">
          {t('cms.contactDesk.loading')}
        </CmsCard>
      )}

      {listQuery.isError && (
        <CmsCard className="mb-6 p-6 text-sm text-rose-700">
          {t('cms.contactDesk.loadFailed')}{' '}
          {(listQuery.error as Error).message}
        </CmsCard>
      )}

      {!listQuery.isLoading && items.length === 0 && (
        <CmsCard className="p-6 text-sm text-stone-500">
          {status !== 'all' || debouncedQuery
            ? t('cms.contactDesk.emptyFiltered')
            : t('cms.contactDesk.empty')}
        </CmsCard>
      )}

      {items.length > 0 && (
        <CmsCard hover={false} className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-[#E8E4DC] bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">{t('cms.contactDesk.colSubject')}</th>
                  <th className="px-4 py-3">{t('cms.contactDesk.colFrom')}</th>
                  <th className="px-4 py-3">{t('cms.contactDesk.colCategory')}</th>
                  <th className="px-4 py-3">{t('cms.contactDesk.colAi')}</th>
                  <th className="px-4 py-3">{t('cms.contactDesk.colStatus')}</th>
                  <th className="px-4 py-3">{t('cms.contactDesk.colDate')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const category = (item.aiCategory ??
                    'UNKNOWN') as ContactCategory
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-[#E8E4DC]/70 transition-colors hover:bg-stone-50/80"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`${BASE_PATH}/${item.id}`}
                          className="font-medium text-stone-900 hover:text-[#0C2686] hover:underline"
                        >
                          <span className="line-clamp-1">{item.subject}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-stone-800">{item.name}</p>
                        <p className="truncate text-xs text-stone-500">
                          {item.email}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full border border-[#0C2686]/15 bg-[#0C2686]/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#0C2686]">
                          {contactCategoryLabel(category, t)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <AiCell summary={item.aiSummary} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={item.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-stone-500">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`${BASE_PATH}/${item.id}`}
                          className="font-semibold text-[#0C2686] hover:underline"
                        >
                          {t('cms.common.open')}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
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
                name="contactPageSize"
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
                className="inline-flex size-8 items-center justify-center rounded-lg border border-[#E8E4DC] text-stone-600 disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
              </button>
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={cn(
                    'inline-flex size-8 items-center justify-center rounded-lg text-xs font-semibold',
                    n === page
                      ? 'bg-[#0C2686] text-white'
                      : 'border border-[#E8E4DC] text-stone-700 hover:border-[#0C2686]/40',
                  )}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || listQuery.isFetching}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-[#E8E4DC] text-stone-600 disabled:opacity-40"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <p className="text-xs text-stone-500">
              {t('cms.common.pageOf', { page, totalPages })}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
