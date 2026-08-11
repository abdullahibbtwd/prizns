import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
  PrimaryButton,
  StatusPill,
} from '@/cms/components/CmsUI'
import { JournalSelect } from '@/components/ui/JournalSelect'
import { deleteCmsArticle, listCmsArticles, listCmsAuthors } from '@/lib/articles-api'
import type { ArticleSection, ArticleStatus, CmsArticle } from '@/lib/cms-types'
import { ARTICLE_SECTIONS } from '@/lib/cms-types'
import { cn } from '@/lib/utils'
import { useJournalLang } from '@/hooks/useJournalLang'
import { pickLang } from '@/lib/pick-lang'
import { getSectionLabel } from '@/lib/section-i18n'
import { ApiError } from '@/lib/api'

const filters: Array<'all' | ArticleStatus | 'sponsored'> = [
  'all',
  'DRAFT',
  'REVIEW',
  'PUBLISHED',
  'SCHEDULED',
  'sponsored',
]

const PAGE_SIZE_OPTIONS = [6, 9, 12, 24] as const
const BASE_PATH = '/cms/stories'
const ALL_SECTIONS = ''
const ALL_AUTHORS = ''

export default function CmsStoriesPage() {
  const { t } = useTranslation()
  const { lang } = useJournalLang()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<(typeof filters)[number]>('all')
  const [section, setSection] = useState(ALL_SECTIONS)
  const [authorId, setAuthorId] = useState(ALL_AUTHORS)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(9)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    setPage(1)
  }, [filter, section, authorId, debouncedQuery, pageSize])

  const authorsQuery = useQuery({
    queryKey: ['cms-authors-options'],
    queryFn: () => listCmsAuthors(),
  })

  const articlesQuery = useQuery({
    queryKey: [
      'cms-articles',
      page,
      pageSize,
      filter,
      section,
      authorId,
      debouncedQuery,
    ],
    queryFn: () =>
      listCmsArticles({
        page,
        pageSize,
        q: debouncedQuery || undefined,
        section: section || undefined,
        authorId: authorId || undefined,
        status:
          filter !== 'all' && filter !== 'sponsored'
            ? (filter as ArticleStatus)
            : undefined,
        sponsored: filter === 'sponsored' ? true : undefined,
      }),
    refetchInterval: (query) => {
      const rows = query.state.data?.items ?? []
      const busy = rows.some(
        (row) =>
          row.translationStatus === 'PENDING' ||
          row.translationStatus === 'RUNNING',
      )
      return busy ? 3000 : false
    },
    placeholderData: (prev) => prev,
  })

  useEffect(() => {
    if (
      !articlesQuery.data ||
      filter !== 'all' ||
      section ||
      authorId ||
      debouncedQuery
    ) {
      return
    }
    queryClient.setQueryData(['cms-articles-count'], {
      items: articlesQuery.data.items.slice(0, 1),
      total: articlesQuery.data.total,
      page: 1,
      pageSize: 1,
      totalPages: articlesQuery.data.totalPages,
    })
  }, [
    filter,
    section,
    authorId,
    debouncedQuery,
    articlesQuery.data,
    queryClient,
  ])

  const stories = articlesQuery.data?.items ?? []
  const total = articlesQuery.data?.total ?? 0
  const totalPages = articlesQuery.data?.totalPages ?? 1

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const sectionOptions = useMemo(
    () => [
      { value: ALL_SECTIONS, label: t('cms.stories.filterSectionAll') },
      ...ARTICLE_SECTIONS.map((item) => ({
        value: item,
        label: getSectionLabel(item, lang),
      })),
    ],
    [lang, t],
  )

  const authorOptions = useMemo(
    () => [
      { value: ALL_AUTHORS, label: t('cms.stories.filterAuthorAll') },
      ...(authorsQuery.data ?? []).map((author) => ({
        value: author.id,
        label: pickLang(lang, author.nameEn ?? author.nameBg, author.nameBg),
      })),
    ],
    [authorsQuery.data, lang, t],
  )

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCmsArticle(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cms-articles'] })
      await queryClient.invalidateQueries({ queryKey: ['cms-articles-count'] })
    },
  })

  const confirmDelete = (story: CmsArticle) => {
    const title = pickLang(lang, story.title, story.titleBg) || story.titleBg
    const ok = window.confirm(
      t('cms.stories.deleteConfirm', { title }),
    )
    if (!ok) return
    deleteMutation.mutate(story.id)
  }

  const filterLabel = (item: (typeof filters)[number]) => {
    if (item === 'all') return t('cms.status.all')
    if (item === 'sponsored') return t('cms.status.sponsored')
    return t(`cms.status.${item.toLowerCase()}`)
  }

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
        title={t('cms.stories.title')}
        description={t('cms.stories.description')}
        badge={t('cms.stories.items', { count: total })}
        actions={
          <Link to={`${BASE_PATH}/new`}>
            <PrimaryButton>
              <Plus className="size-4" />
              {t('cms.stories.newStory')}
            </PrimaryButton>
          </Link>
        }
      />

      <div className="mb-6 space-y-4 rounded-2xl border border-[#E8E4DC] bg-white p-4 shadow-2xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                  filter === item
                    ? 'bg-[#0C2686] text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200',
                )}
              >
                {filterLabel(item)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-stone-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('cms.stories.filterPlaceholder')}
                className="w-full rounded-xl border border-[#E8E4DC] bg-stone-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-[#0C2686]"
              />
            </div>
            <div className="flex rounded-xl border border-[#E8E4DC] bg-stone-50 p-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'rounded-lg p-1.5',
                  viewMode === 'grid' ? 'bg-white text-[#0C2686]' : 'text-stone-400',
                )}
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  'rounded-lg p-1.5',
                  viewMode === 'table' ? 'bg-white text-[#0C2686]' : 'text-stone-400',
                )}
              >
                <List className="size-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <JournalSelect
            name="cms-stories-section"
            variant="boxed"
            label={t('cms.stories.filterSection')}
            placeholder={t('cms.stories.filterSectionAll')}
            options={sectionOptions}
            value={section}
            onChange={(value) =>
              setSection(value as ArticleSection | typeof ALL_SECTIONS)
            }
          />
          <JournalSelect
            name="cms-stories-author"
            variant="boxed"
            label={t('cms.stories.filterAuthor')}
            placeholder={t('cms.stories.filterAuthorAll')}
            options={authorOptions}
            value={authorId}
            onChange={setAuthorId}
          />
        </div>
      </div>

      {articlesQuery.isLoading && (
        <p className="text-sm text-stone-500">{t('cms.stories.loading')}</p>
      )}
      {articlesQuery.isError && (
        <p className="text-sm text-rose-700">{t('cms.stories.loadFailed')}</p>
      )}

      {deleteMutation.isError && (
        <p className="mb-4 text-sm text-rose-700">
          {t('cms.stories.deleteFailed')}
          {(deleteMutation.error as ApiError)?.message
            ? `: ${(deleteMutation.error as ApiError).message}`
            : ''}
        </p>
      )}

      {!articlesQuery.isLoading && total === 0 && (
        <CmsCard className="p-8 text-center text-sm text-stone-500">
          {t('cms.stories.empty')}{' '}
          <Link to={`${BASE_PATH}/new`} className="font-semibold text-[#0C2686]">
            {t('cms.stories.createFirst')}
          </Link>
        </CmsCard>
      )}

      {total > 0 && viewMode === 'grid' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stories.map((story) => (
            <CmsCard key={story.id} className="overflow-hidden p-0">
              <div className="aspect-[16/10] bg-stone-100">
                {story.image ? (
                  <img
                    src={story.image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="space-y-3 p-4">
                <div className="flex flex-wrap gap-2">
                  <StatusPill status={story.status} />
                  <StatusPill status={story.translationStatus} />
                  {(story.relateCount ?? 0) > 0 ? (
                    <span className="rounded-full bg-[#0C2686]/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#0C2686]">
                      {t('cms.stories.colRelates')} · {story.relateCount}
                    </span>
                  ) : null}
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-stone-500">
                    {getSectionLabel(story.section, lang)}
                  </p>
                  <h3 className="font-heading text-xl text-stone-900">
                    {pickLang(lang, story.title, story.titleBg)}
                  </h3>
                  <p className="mt-1 text-xs text-stone-500">
                    {pickLang(lang, story.author, story.authorBg) ||
                      t('cms.stories.noAuthor')}{' '}
                    · {story.updatedAt?.slice(0, 10)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to={`${BASE_PATH}/${story.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0C2686]"
                  >
                    <Edit className="size-3.5" /> {t('cms.stories.edit')}
                  </Link>
                  {story.status === 'PUBLISHED' && (
                    <a
                      href={story.path}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600"
                    >
                      <Eye className="size-3.5" /> {t('cms.stories.view')}
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => confirmDelete(story)}
                    disabled={deleteMutation.isPending}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" />
                    {deleteMutation.isPending
                      ? t('cms.stories.deleting')
                      : t('cms.stories.delete')}
                  </button>
                </div>
              </div>
            </CmsCard>
          ))}
        </div>
      )}

      {total > 0 && viewMode === 'table' && (
        <CmsCard className="overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E8E4DC] bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-4 py-3">{t('cms.stories.colTitle')}</th>
                <th className="px-4 py-3">{t('cms.stories.colSection')}</th>
                <th className="px-4 py-3">{t('cms.stories.colStatus')}</th>
                <th className="px-4 py-3">{t('cms.stories.colTranslation')}</th>
                <th className="px-4 py-3">{t('cms.stories.colRelates')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {stories.map((story) => (
                <tr key={story.id} className="border-b border-[#E8E4DC]/70">
                  <td className="px-4 py-3 font-medium">
                    {pickLang(lang, story.title, story.titleBg)}
                  </td>
                  <td className="px-4 py-3">
                    {getSectionLabel(story.section, lang)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={story.status} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={story.translationStatus} />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-stone-600">
                    {story.relateCount ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        to={`${BASE_PATH}/${story.id}`}
                        className="font-semibold text-[#0C2686]"
                      >
                        {t('cms.stories.edit')}
                      </Link>
                      <button
                        type="button"
                        onClick={() => confirmDelete(story)}
                        disabled={deleteMutation.isPending}
                        className="font-semibold text-rose-700 disabled:opacity-50"
                      >
                        {t('cms.stories.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CmsCard>
      )}

      {total > 0 && (
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-[#E8E4DC] bg-white px-4 py-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-stone-600">
            {t('cms.stories.showing', { from, to, count: total })}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-[140px] items-center gap-3">
              <span className="shrink-0 text-xs font-medium text-stone-600">
                {t('cms.stories.perPage')}
              </span>
              <JournalSelect
                name="storiesPageSize"
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
                disabled={page <= 1 || articlesQuery.isFetching}
                className="inline-flex items-center gap-1 rounded-xl border border-[#E8E4DC] bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="size-3.5" />
                {t('cms.stories.prev')}
              </button>

              {pageNumbers.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPage(num)}
                  disabled={articlesQuery.isFetching}
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
                disabled={page >= totalPages || articlesQuery.isFetching}
                className="inline-flex items-center gap-1 rounded-xl border border-[#E8E4DC] bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t('cms.stories.next')}
                <ChevronRight className="size-3.5" />
              </button>
            </div>

            <p className="text-xs font-medium text-stone-500">
              {t('cms.stories.pageOf', { page, total: totalPages })}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
