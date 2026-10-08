import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { PageMeta } from '@/components/PageMeta'
import { useCmsConfirm } from '@/cms/components/CmsConfirmDialog'
import { PrimaryButton, StatusPill } from '@/cms/components/CmsUI'
import { useJournalLang } from '@/hooks/useJournalLang'
import { useAuth } from '@/lib/auth'
import { getCmsArticle, updateCmsArticle } from '@/lib/articles-api'
import { canPublishStories } from '@/lib/cms-roles'
import { articlePath } from '@/lib/public-content'
import {
  stripEmptyBodyBlocks,
  validateStoryForPublish,
} from '@/lib/translation-quality'
import {
  ArticleContent,
  toJournalArticle,
} from '@/routes/article'
import NotFoundPage from '@/routes/not-found'

function publicSection(article: { path?: string; section: string }) {
  if (article.path) {
    const part = article.path.split('/').filter(Boolean)[0]
    if (part) return part
  }
  if (
    article.section === 'human-stories' ||
    article.section === 'human_stories' ||
    article.section === 'featured'
  ) {
    return 'stories'
  }
  return article.section
}

export default function CmsStoryPreviewPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { t } = useTranslation()
  const { lang, setLang } = useJournalLang()
  const { confirm, dialog } = useCmsConfirm()
  const queryClient = useQueryClient()
  const [publishError, setPublishError] = useState('')

  const canPublish = canPublishStories(user)

  const articleQuery = useQuery({
    queryKey: ['cms-article', id],
    queryFn: () => getCmsArticle(id!),
    enabled: Boolean(id) && canPublish,
    retry: false,
  })

  const publishMutation = useMutation({
    mutationFn: async () => {
      const article = articleQuery.data
      if (!article) throw new Error('Missing article')
      const body = stripEmptyBodyBlocks(article.bodyRaw ?? article.body ?? [])
      const issues = validateStoryForPublish({
        titleBg: article.titleBg,
        titleEn: article.title ?? null,
        subtitleBg: article.subtitleBg,
        subtitleEn: article.subtitle ?? null,
        translationStatus: article.translationStatus,
        body,
      }).filter((issue) => issue.code !== 'translation_not_ready')
      if (issues.length > 0) {
        throw new Error(
          issues
            .map((issue) => t(`cms.editor.publishIssue.${issue.code}`))
            .join(' '),
        )
      }
      return updateCmsArticle(article.id, { status: 'PUBLISHED' })
    },
    onSuccess: async (article) => {
      setPublishError('')
      queryClient.setQueryData(['cms-article', article.id], article)
      await queryClient.invalidateQueries({ queryKey: ['cms-articles'] })
      await queryClient.invalidateQueries({ queryKey: ['cms-articles-count'] })
      await queryClient.invalidateQueries({ queryKey: ['public-articles'] })
      await queryClient.invalidateQueries({ queryKey: ['public-article'] })
      await queryClient.invalidateQueries({ queryKey: ['popular-stories'] })
    },
    onError: (error) => {
      setPublishError(
        error instanceof Error ? error.message : t('cms.editor.saveFailed'),
      )
    },
  })

  if (!canPublish) {
    return <Navigate to="/cms" replace />
  }

  if (!id) {
    return <NotFoundPage />
  }

  if (articleQuery.isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#FAF8F3] font-sans text-sm text-stone-600">
        <Loader2 className="mr-2 size-5 animate-spin text-[#0C2686]" />
        {t('cms.editor.previewLoading')}
      </div>
    )
  }

  if (articleQuery.isError || !articleQuery.data) {
    return <NotFoundPage />
  }

  const cmsArticle = articleQuery.data
  const article = toJournalArticle(cmsArticle)
  const section = publicSection(cmsArticle)
  const path = articlePath(cmsArticle)
  const editorPath = `/cms/stories/${cmsArticle.id}`
  const isLive = cmsArticle.status === 'PUBLISHED'
  const publishing = publishMutation.isPending

  const handlePublish = async () => {
    setPublishError('')
    const ok = await confirm({
      title: t('cms.editor.publishConfirmTitle'),
      description: t('cms.editor.publishConfirmBody'),
      confirmLabel: t('cms.editor.publish'),
      cancelLabel: t('cms.editor.cancel'),
      variant: 'default',
    })
    if (!ok) return
    publishMutation.mutate()
  }

  const previewBanner = (
    <>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={editorPath}
            className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 transition-colors hover:text-[#0C2686]"
          >
            <ArrowLeft className="size-4" />
            {t('cms.editor.previewBackToEditor')}
          </Link>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
            {t('cms.editor.previewBadge')}
          </span>
          <StatusPill status={cmsArticle.status} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isLive ? (
            <a
              href={path}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E8E4DC] bg-white px-4 py-2.5 text-sm font-medium text-stone-700 shadow-2xs transition-all hover:border-[#0C2686]/30 hover:bg-stone-50"
            >
              {t('cms.editor.previewViewLive')}
            </a>
          ) : (
            <PrimaryButton
              type="button"
              disabled={publishing}
              aria-busy={publishing}
              onClick={() => void handlePublish()}
            >
              {publishing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t('cms.editor.publishingNow')}
                </>
              ) : (
                t('cms.editor.publish')
              )}
            </PrimaryButton>
          )}
        </div>
      </div>
      {publishError || publishMutation.isError ? (
        <p
          role="alert"
          className="border-t border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800 md:px-6"
        >
          {publishError || t('cms.editor.saveFailed')}
        </p>
      ) : null}
      {publishMutation.isSuccess && isLive ? (
        <p
          role="status"
          className="border-t border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 md:px-6"
        >
          {t('cms.editor.previewPublished')}
        </p>
      ) : null}
    </>
  )

  return (
    <>
      {dialog}
      <JournalShell navVariant="solid" hideChrome>
        {() => (
          <>
            <PageMeta
              lang={lang}
              type="article"
              title={`${t('cms.editor.previewBadge')}: ${
                lang === 'bg'
                  ? article.titleBg || article.title
                  : article.title || article.titleBg
              }`}
              description={undefined}
              path={`/cms/stories/${cmsArticle.id}/preview`}
              noIndex
            />
            <ArticleContent
              article={article}
              lang={lang}
              setLang={setLang}
              section={section}
              preview={{
                backTo: editorPath,
                banner: previewBanner,
              }}
            />
          </>
        )}
      </JournalShell>
    </>
  )
}
