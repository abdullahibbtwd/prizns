import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  ListChecks,
  Search,
  Share2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
  GhostButton,
  PrimaryButton,
  StatusPill,
} from '@/cms/components/CmsUI'
import { JournalSelect } from '@/components/ui/JournalSelect'
import { listCmsArticles, listCmsAuthors } from '@/lib/articles-api'
import { ApiError } from '@/lib/api'
import type { ArticleStatus, CmsArticle } from '@/lib/cms-types'
import { ARTICLE_SECTIONS } from '@/lib/cms-types'
import { useJournalLang } from '@/hooks/useJournalLang'
import { pickLang } from '@/lib/pick-lang'
import { getSectionLabel } from '@/lib/section-i18n'
import { cn } from '@/lib/utils'
import { useCmsConfirm } from '@/cms/components/CmsConfirmDialog'
import {
  approveCmsSocialPost,
  deleteCmsSocialPost,
  generateCmsSocial,
  getCmsSocialPlatforms,
  listCmsSocialPosts,
  saveCmsSocialPlatforms,
  updateCmsSocialPost,
  type SocialPlatformCatalogItem,
  type SocialPost,
} from '@/lib/social-api'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const
const ALL_SECTIONS = ''
const ALL_AUTHORS = ''

type PackSummary = {
  total: number
  draft: number
  approved: number
  posts: SocialPost[]
}

function summarizePacks(posts: SocialPost[]) {
  const map = new Map<string, PackSummary>()
  for (const post of posts) {
    const current = map.get(post.articleId) ?? {
      total: 0,
      draft: 0,
      approved: 0,
      posts: [],
    }
    current.total += 1
    if (post.status === 'APPROVED') current.approved += 1
    else current.draft += 1
    current.posts.push(post)
    map.set(post.articleId, current)
  }
  return map
}

export default function CmsSocialPage() {
  const { t } = useTranslation()
  const { lang } = useJournalLang()
  const { confirm, dialog } = useCmsConfirm()
  const queryClient = useQueryClient()

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'PUBLISHED' | ''>('PUBLISHED')
  const [section, setSection] = useState(ALL_SECTIONS)
  const [authorId, setAuthorId] = useState(ALL_AUTHORS)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] =
    useState<(typeof PAGE_SIZE_OPTIONS)[number]>(20)
  const [openArticleId, setOpenArticleId] = useState<string | null>(null)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<
    Record<string, { body: string; hashtags: string }>
  >({})
  const [toast, setToast] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [platformsOpen, setPlatformsOpen] = useState(false)
  const [draftPlatforms, setDraftPlatforms] = useState<string[]>([])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    setPage(1)
  }, [debouncedQuery, statusFilter, section, authorId, pageSize])

  const authorsQuery = useQuery({
    queryKey: ['cms-authors-options'],
    queryFn: () => listCmsAuthors(),
  })

  const platformsQuery = useQuery({
    queryKey: ['cms-social-platforms'],
    queryFn: () => getCmsSocialPlatforms(),
  })

  useEffect(() => {
    if (platformsOpen && platformsQuery.data) {
      setDraftPlatforms(platformsQuery.data.platforms)
    }
  }, [platformsOpen, platformsQuery.data])

  const catalogByCode = useMemo(() => {
    const map = new Map<string, SocialPlatformCatalogItem>()
    for (const item of platformsQuery.data?.catalog ?? []) {
      map.set(item.code, item)
    }
    return map
  }, [platformsQuery.data])

  const selectedPlatformCount = platformsQuery.data?.platforms.length ?? 0

  const articlesQuery = useQuery({
    queryKey: [
      'cms-social-stories',
      page,
      pageSize,
      statusFilter,
      section,
      authorId,
      debouncedQuery,
    ],
    queryFn: () =>
      listCmsArticles({
        page,
        pageSize,
        q: debouncedQuery || undefined,
        status: (statusFilter || undefined) as ArticleStatus | undefined,
        section: section || undefined,
        authorId: authorId || undefined,
      }),
    placeholderData: (prev) => prev,
  })

  const packsQuery = useQuery({
    queryKey: ['cms-social-packs'],
    queryFn: () => listCmsSocialPosts(),
  })

  const packsByArticle = useMemo(
    () => summarizePacks(packsQuery.data ?? []),
    [packsQuery.data],
  )

  const sectionOptions = useMemo(
    () => [
      { value: ALL_SECTIONS, label: t('cms.social.filterSectionAll') },
      ...ARTICLE_SECTIONS.map((item) => ({
        value: item,
        label: getSectionLabel(item, lang),
      })),
    ],
    [lang, t],
  )

  const authorOptions = useMemo(
    () => [
      { value: ALL_AUTHORS, label: t('cms.social.filterAuthorAll') },
      ...(authorsQuery.data ?? []).map((author) => ({
        value: author.id,
        label: pickLang(lang, author.nameEn ?? author.nameBg, author.nameBg),
      })),
    ],
    [authorsQuery.data, lang, t],
  )

  const items = articlesQuery.data?.items ?? []
  const total = articlesQuery.data?.total ?? 0
  const totalPages = articlesQuery.data?.totalPages ?? 1
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

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

  const openArticle = items.find((a) => a.id === openArticleId)
  const openPack =
    (openArticleId && packsByArticle.get(openArticleId)?.posts) ||
    (packsQuery.data ?? []).filter((p) => p.articleId === openArticleId)

  const platformLabel = (platform: string) => {
    const item = catalogByCode.get(platform)
    if (!item) return platform
    return lang === 'bg' ? item.labelBg : item.labelEn
  }

  const packLabel = (summary?: PackSummary) => {
    if (!summary || summary.total === 0) return t('cms.social.noPack')
    if (summary.approved === summary.total) {
      return t('cms.social.packApproved', { count: summary.approved })
    }
    if (summary.draft === summary.total) {
      return t('cms.social.packDraft', { count: summary.draft })
    }
    return t('cms.social.packMixed', {
      approved: summary.approved,
      draft: summary.draft,
    })
  }

  const savePlatformsMutation = useMutation({
    mutationFn: (platforms: string[]) => saveCmsSocialPlatforms(platforms),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cms-social-platforms'] })
      setPlatformsOpen(false)
      setToast(t('cms.social.platformsSaved'))
    },
  })

  const generateMutation = useMutation({
    mutationFn: (articleId: string) => generateCmsSocial(articleId),
    onMutate: (articleId) => setGeneratingId(articleId),
    onSuccess: async (posts, articleId) => {
      await queryClient.invalidateQueries({ queryKey: ['cms-social-packs'] })
      setOpenArticleId(articleId)
      setDrafts((prev) => {
        const next = { ...prev }
        for (const post of posts) {
          next[post.id] = { body: post.body, hashtags: post.hashtags }
        }
        return next
      })
    },
    onSettled: () => setGeneratingId(null),
  })

  const saveMutation = useMutation({
    mutationFn: (post: SocialPost) => {
      const draft = drafts[post.id]
      return updateCmsSocialPost(post.id, {
        body: draft?.body ?? post.body,
        hashtags: draft?.hashtags ?? post.hashtags,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cms-social-packs'] })
      setToast(t('cms.social.saved'))
    },
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveCmsSocialPost(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cms-social-packs'] })
    },
  })

  const approveAllMutation = useMutation({
    mutationFn: async (posts: SocialPost[]) => {
      await Promise.all(
        posts
          .filter((p) => p.status !== 'APPROVED')
          .map((p) => approveCmsSocialPost(p.id)),
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cms-social-packs'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCmsSocialPost(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cms-social-packs'] })
    },
  })

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!copiedKey) return
    const timer = window.setTimeout(() => setCopiedKey(null), 1600)
    return () => window.clearTimeout(timer)
  }, [copiedKey])

  const copyText = async (key: string, value: string) => {
    const text = value.trim()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
    } catch {
      setToast(t('cms.social.generateFailed'))
    }
  }

  const openPackSorted = useMemo(() => {
    const catalogOrder = new Map(
      (platformsQuery.data?.catalog ?? []).map((item, index) => [
        item.code,
        index,
      ]),
    )
    return [...openPack].sort(
      (a, b) =>
        (catalogOrder.get(a.platform) ?? 999) -
        (catalogOrder.get(b.platform) ?? 999),
    )
  }, [openPack, platformsQuery.data])

  const toggleDraftPlatform = (code: string) => {
    setDraftPlatforms((prev) =>
      prev.includes(code)
        ? prev.filter((item) => item !== code)
        : [...prev, code],
    )
  }

  const storyTitle = (article: CmsArticle) =>
    pickLang(lang, article.title, article.titleBg) || article.titleBg

  return (
    <div>
      <CmsPageHeader
        title={t('cms.social.title')}
        description={t('cms.social.description')}
        badge={t('cms.social.badge')}
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <GhostButton type="button" onClick={() => setPlatformsOpen(true)}>
          <ListChecks className="size-3.5" />
          {t('cms.social.platformsOpen')}
          <span className="rounded-full bg-[#0C2686]/10 px-2 py-0.5 text-[10px] font-semibold text-[#0C2686]">
            {t('cms.social.platformsSelected', {
              count: selectedPlatformCount,
            })}
          </span>
        </GhostButton>
      </div>

      <div className="mb-5 space-y-3">
        <div className="relative w-full lg:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('cms.social.search')}
            className="w-full rounded-xl border border-[#E8E4DC] bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-[#0C2686]"
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <JournalSelect
            name="social-story-status"
            variant="boxed"
            label={t('cms.social.storyStatus')}
            options={[
              { value: 'PUBLISHED', label: t('cms.social.publishedOnly') },
              { value: '', label: t('cms.social.allStories') },
            ]}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as 'PUBLISHED' | '')}
          />
          <JournalSelect
            name="social-section"
            variant="boxed"
            label={t('cms.social.filterSection')}
            options={sectionOptions}
            value={section}
            onChange={setSection}
          />
          <JournalSelect
            name="social-author"
            variant="boxed"
            label={t('cms.social.filterAuthor')}
            options={authorOptions}
            value={authorId}
            onChange={setAuthorId}
          />
          <JournalSelect
            name="social-page-size"
            variant="boxed"
            label={t('cms.social.perPage')}
            options={PAGE_SIZE_OPTIONS.map((size) => ({
              value: String(size),
              label: String(size),
            }))}
            value={String(pageSize)}
            onChange={(value) =>
              setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number])
            }
          />
        </div>
      </div>

      {articlesQuery.isLoading ? (
        <CmsCard className="p-8 text-sm text-stone-500">
          {t('cms.social.loading')}
        </CmsCard>
      ) : items.length === 0 ? (
        <CmsCard className="p-10 text-center text-sm text-stone-500">
          {debouncedQuery ? t('cms.social.emptySearch') : t('cms.social.empty')}
        </CmsCard>
      ) : (
        <CmsCard hover={false} className="overflow-hidden p-0 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-[#E8E4DC] bg-[#FAF8F3] text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                <tr>
                  <th className="px-5 py-3.5">{t('cms.social.colStory')}</th>
                  <th className="px-4 py-3.5">{t('cms.social.colSection')}</th>
                  <th className="px-4 py-3.5">{t('cms.social.colStatus')}</th>
                  <th className="px-4 py-3.5">{t('cms.social.colPack')}</th>
                  <th className="px-5 py-3.5 text-right">
                    {t('cms.social.colActions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((article) => {
                  const pack = packsByArticle.get(article.id)
                  const busy = generatingId === article.id
                  const canGenerate = article.status === 'PUBLISHED'
                  return (
                    <tr
                      key={article.id}
                      className="border-b border-[#E8E4DC]/70 transition-colors hover:bg-[#0C2686]/[0.03]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#E8E4DC] bg-white text-[#0C2686]">
                            <Share2 className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-stone-900">
                              {storyTitle(article)}
                            </p>
                            <p className="truncate text-[11px] text-stone-500">
                              {article.path || article.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-stone-600">
                        {getSectionLabel(article.section, lang)}
                      </td>
                      <td className="px-4 py-4">
                        <StatusPill status={article.status} />
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            'inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                            pack?.total
                              ? pack.approved === pack.total
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                : 'border-amber-200 bg-amber-50 text-amber-800'
                              : 'border-stone-200 bg-stone-50 text-stone-500',
                          )}
                        >
                          {packLabel(pack)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <GhostButton
                            type="button"
                            disabled={!canGenerate || busy}
                            title={
                              canGenerate
                                ? undefined
                                : t('cms.social.onlyPublished')
                            }
                            onClick={() => generateMutation.mutate(article.id)}
                            className="!px-3 !py-1.5 text-xs"
                          >
                            <Sparkles className="size-3.5" />
                            {busy
                              ? t('cms.social.regenerating')
                              : pack?.total
                                ? t('cms.social.regenerate')
                                : t('cms.social.generate')}
                          </GhostButton>
                          <PrimaryButton
                            type="button"
                            onClick={() => setOpenArticleId(article.id)}
                            className="!px-3 !py-1.5 text-xs"
                          >
                            <Eye className="size-3.5" />
                            {t('cms.social.open')}
                          </PrimaryButton>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CmsCard>
      )}

      {generateMutation.isError ? (
        <p className="mt-3 text-xs text-rose-700">
          {(generateMutation.error as ApiError)?.message ||
            t('cms.social.generateFailed')}
        </p>
      ) : null}

      {total > 0 ? (
        <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-[#E8E4DC] bg-white px-4 py-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-stone-600">
            {t('cms.social.showing', { from, to, total })}
          </p>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || articlesQuery.isFetching}
              className="inline-flex items-center gap-1 rounded-xl border border-[#E8E4DC] bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="size-3.5" />
              {t('cms.social.prev')}
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
              {t('cms.social.next')}
              <ChevronRight className="size-3.5" />
            </button>
            <p className="ml-2 text-xs font-medium text-stone-500">
              {t('cms.social.pageOf', { page, totalPages })}
            </p>
          </div>
        </div>
      ) : null}

      {openArticleId ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px]"
            aria-label={t('cms.social.close')}
            onClick={() => setOpenArticleId(null)}
          />
          <aside className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-[#E8E4DC] bg-[#FDFBF7] shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-[#E8E4DC] px-5 py-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0C2686]">
                  {t('cms.social.panelTitle')}
                </p>
                <h2 className="mt-1 truncate font-heading text-xl text-stone-900">
                  {openArticle
                    ? storyTitle(openArticle)
                    : openPack[0]?.article?.titleBg || '—'}
                </h2>
                <p className="mt-1 text-xs text-stone-500">
                  {t('cms.social.panelHint')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenArticleId(null)}
                className="rounded-xl border border-[#E8E4DC] bg-white p-2 text-stone-600 hover:text-stone-900"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {openPack.length === 0 ? (
                <CmsCard className="space-y-4 p-6 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-[#E8E4DC] bg-white text-[#0C2686]">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-800">
                      {t('cms.social.noPack')}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {openArticle?.status === 'PUBLISHED'
                        ? t('cms.social.panelHint')
                        : t('cms.social.onlyPublished')}
                    </p>
                  </div>
                  <PrimaryButton
                    type="button"
                    className="mx-auto"
                    disabled={
                      openArticle?.status !== 'PUBLISHED' ||
                      generatingId === openArticleId
                    }
                    onClick={() => {
                      if (openArticleId) generateMutation.mutate(openArticleId)
                    }}
                  >
                    <Sparkles className="size-3.5" />
                    {generatingId === openArticleId
                      ? t('cms.social.regenerating')
                      : t('cms.social.generate')}
                  </PrimaryButton>
                  {generateMutation.isError ? (
                    <p className="text-xs text-rose-700">
                      {(generateMutation.error as ApiError)?.message ||
                        t('cms.social.generateFailed')}
                    </p>
                  ) : null}
                </CmsCard>
              ) : (
                openPackSorted.map((post) => {
                  const draft = drafts[post.id] ?? {
                    body: post.body,
                    hashtags: post.hashtags,
                  }
                  return (
                    <CmsCard key={post.id} className="space-y-3 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0C2686]">
                          {platformLabel(post.platform)}
                        </p>
                        <StatusPill status={post.status} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-stone-600">
                            {t('cms.social.copy')}
                          </span>
                          <button
                            type="button"
                            title={t('cms.social.copyBody')}
                            onClick={() =>
                              void copyText(`${post.id}-body`, draft.body)
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-[#E8E4DC] bg-white px-2 py-1 text-[11px] font-semibold text-stone-600 transition hover:border-[#0C2686]/30 hover:text-[#0C2686]"
                          >
                            {copiedKey === `${post.id}-body` ? (
                              <CheckCheck className="size-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                            {copiedKey === `${post.id}-body`
                              ? t('cms.social.copied')
                              : t('cms.social.copyBody')}
                          </button>
                        </div>
                        <textarea
                          value={draft.body}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [post.id]: { ...draft, body: e.target.value },
                            }))
                          }
                          rows={7}
                          className="w-full rounded-xl border border-[#E8E4DC] bg-white px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-[#0C2686]"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-stone-600">
                            {t('cms.social.hashtags')}
                          </span>
                          <button
                            type="button"
                            title={t('cms.social.copyHashtags')}
                            onClick={() =>
                              void copyText(
                                `${post.id}-hashtags`,
                                draft.hashtags,
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-[#E8E4DC] bg-white px-2 py-1 text-[11px] font-semibold text-stone-600 transition hover:border-[#0C2686]/30 hover:text-[#0C2686]"
                          >
                            {copiedKey === `${post.id}-hashtags` ? (
                              <CheckCheck className="size-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                            {copiedKey === `${post.id}-hashtags`
                              ? t('cms.social.copied')
                              : t('cms.social.copyHashtags')}
                          </button>
                        </div>
                        <input
                          value={draft.hashtags}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [post.id]: {
                                ...draft,
                                hashtags: e.target.value,
                              },
                            }))
                          }
                          className="w-full rounded-xl border border-[#E8E4DC] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0C2686]"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <GhostButton
                          type="button"
                          className="!px-3 !py-1.5 text-xs"
                          disabled={saveMutation.isPending}
                          onClick={() => saveMutation.mutate(post)}
                        >
                          {t('cms.social.saveEdits')}
                        </GhostButton>
                        {post.status !== 'APPROVED' ? (
                          <PrimaryButton
                            type="button"
                            className="!px-3 !py-1.5 text-xs"
                            disabled={approveMutation.isPending}
                            onClick={() => approveMutation.mutate(post.id)}
                          >
                            <Check className="size-3.5" />
                            {t('cms.social.approve')}
                          </PrimaryButton>
                        ) : null}
                        <GhostButton
                          type="button"
                          className="!px-3 !py-1.5 text-xs text-rose-700"
                          disabled={deleteMutation.isPending}
                          onClick={async () => {
                            const ok = await confirm({
                              title: t('cms.social.delete'),
                              description: t('cms.social.deleteConfirm'),
                            })
                            if (ok) deleteMutation.mutate(post.id)
                          }}
                        >
                          <Trash2 className="size-3.5" />
                          {t('cms.social.delete')}
                        </GhostButton>
                      </div>
                    </CmsCard>
                  )
                })
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E8E4DC] bg-white px-5 py-4">
              {openPackSorted.length > 0 ? (
                <PrimaryButton
                  type="button"
                  disabled={
                    approveAllMutation.isPending ||
                    openPackSorted.every((p) => p.status === 'APPROVED')
                  }
                  onClick={() => approveAllMutation.mutate(openPackSorted)}
                >
                  <Check className="size-3.5" />
                  {t('cms.social.approveAll')}
                </PrimaryButton>
              ) : (
                <span className="text-xs text-stone-500">
                  {openArticle?.status === 'PUBLISHED'
                    ? t('cms.social.panelHint')
                    : t('cms.social.onlyPublished')}
                </span>
              )}
              {openArticle?.status === 'PUBLISHED' ||
              (!openArticle &&
                openPackSorted[0]?.article?.status === 'PUBLISHED') ? (
                <GhostButton
                  type="button"
                  disabled={generatingId === openArticleId}
                  onClick={() => {
                    if (openArticleId) generateMutation.mutate(openArticleId)
                  }}
                >
                  <Sparkles className="size-3.5" />
                  {generatingId === openArticleId
                    ? t('cms.social.regenerating')
                    : openPackSorted.length > 0
                      ? t('cms.social.regenerate')
                      : t('cms.social.generate')}
                </GhostButton>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

      {platformsOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px]"
            aria-label={t('cms.social.close')}
            onClick={() => setPlatformsOpen(false)}
          />
          <div className="relative z-10 flex max-h-[min(40rem,90vh)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#E8E4DC] bg-[#FDFBF7] shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[#E8E4DC] px-5 py-4">
              <div>
                <h2 className="font-heading text-xl text-stone-900">
                  {t('cms.social.platformsTitle')}
                </h2>
                <p className="mt-1 text-xs text-stone-500">
                  {t('cms.social.platformsHint')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPlatformsOpen(false)}
                className="rounded-xl border border-[#E8E4DC] bg-white p-2 text-stone-600"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-[#E8E4DC] px-5 py-3">
              <GhostButton
                type="button"
                className="!px-3 !py-1.5 text-xs"
                onClick={() =>
                  setDraftPlatforms(
                    (platformsQuery.data?.catalog ?? []).map((p) => p.code),
                  )
                }
              >
                {t('cms.social.selectAll')}
              </GhostButton>
              <GhostButton
                type="button"
                className="!px-3 !py-1.5 text-xs"
                onClick={() =>
                  setDraftPlatforms(
                    (platformsQuery.data?.catalog ?? [])
                      .filter((p) => p.defaultSelected)
                      .map((p) => p.code),
                  )
                }
              >
                {t('cms.social.selectDefault')}
              </GhostButton>
              <span className="ml-auto self-center text-xs font-semibold text-[#0C2686]">
                {t('cms.social.platformsSelected', {
                  count: draftPlatforms.length,
                })}
              </span>
            </div>

            <div className="grid flex-1 gap-2 overflow-y-auto p-4 sm:grid-cols-2">
              {(platformsQuery.data?.catalog ?? []).map((item) => {
                const checked = draftPlatforms.includes(item.code)
                const hint = lang === 'bg' ? item.hintBg : item.hintEn
                const label = lang === 'bg' ? item.labelBg : item.labelEn
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => toggleDraftPlatform(item.code)}
                    className={cn(
                      'rounded-xl border px-3 py-3 text-left transition',
                      checked
                        ? 'border-[#0C2686] bg-[#0C2686]/5'
                        : 'border-[#E8E4DC] bg-white hover:border-[#0C2686]/30',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={cn(
                          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border',
                          checked
                            ? 'border-[#0C2686] bg-[#0C2686] text-white'
                            : 'border-stone-300 bg-white',
                        )}
                      >
                        {checked ? <Check className="size-3" /> : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-stone-900">
                          {label}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-stone-500">
                          {hint}
                        </span>
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#E8E4DC] bg-white px-5 py-4">
              <GhostButton type="button" onClick={() => setPlatformsOpen(false)}>
                {t('cms.social.close')}
              </GhostButton>
              <PrimaryButton
                type="button"
                disabled={
                  draftPlatforms.length === 0 || savePlatformsMutation.isPending
                }
                onClick={() => savePlatformsMutation.mutate(draftPlatforms)}
              >
                {savePlatformsMutation.isPending
                  ? t('cms.social.platformsSaving')
                  : t('cms.social.platformsSave')}
              </PrimaryButton>
            </div>
            {savePlatformsMutation.isError ? (
              <p className="px-5 pb-4 text-xs text-rose-700">
                {(savePlatformsMutation.error as ApiError)?.message ||
                  t('cms.social.generateFailed')}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 right-6 z-[70] rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 shadow-lg">
          {toast}
        </div>
      ) : null}
      {dialog}
    </div>
  )
}
