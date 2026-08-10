import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Headphones, Loader2, Trash2 } from 'lucide-react'
import { CmsCard, GhostButton, PrimaryButton, StatusPill } from '@/cms/components/CmsUI'
import {
  clearArticleNarration,
  queueArticleNarration,
} from '@/lib/articles-api'
import type { CmsArticle } from '@/lib/cms-types'
import { ApiError } from '@/lib/api'

type NarrationPanelProps = {
  articleId: string
  article: CmsArticle
  audioUrl?: string
}

export function NarrationPanel({
  articleId,
  article,
  audioUrl,
}: NarrationPanelProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const status = article.narrationStatus ?? 'IDLE'
  const busy = status === 'PENDING' || status === 'RUNNING'

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['cms-article', articleId] })
    await queryClient.invalidateQueries({ queryKey: ['cms-articles'] })
  }

  const narrateMutation = useMutation({
    mutationFn: () => queueArticleNarration(articleId),
    onSuccess: invalidate,
  })

  const clearMutation = useMutation({
    mutationFn: () => clearArticleNarration(articleId),
    onSuccess: invalidate,
  })

  return (
    <CmsCard className="space-y-3 p-5">
      <div className="flex items-center gap-2">
        <Headphones className="size-4 text-[#0C2686]" />
        <h3 className="text-sm font-semibold">{t('cms.editor.narrationTitle')}</h3>
      </div>
      <p className="text-[11px] leading-relaxed text-stone-500">
        {t('cms.editor.narrationHint')}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={status} />
        {busy ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-stone-500">
            <Loader2 className="size-3 animate-spin" />
            {t('cms.editor.narrationGenerating')}
          </span>
        ) : null}
      </div>

      {status === 'FAILED' && article.narrationError ? (
        <p className="text-xs text-rose-700">{article.narrationError}</p>
      ) : null}

      {status === 'READY' && audioUrl ? (
        <audio controls src={audioUrl} className="w-full" preload="metadata" />
      ) : null}

      <PrimaryButton
        type="button"
        className="w-full"
        disabled={busy || narrateMutation.isPending}
        onClick={() => narrateMutation.mutate()}
      >
        <Headphones className="size-3.5" />
        {busy || narrateMutation.isPending
          ? t('cms.editor.narrationGenerating')
          : status === 'READY'
            ? t('cms.editor.narrationRegenerate')
            : t('cms.editor.narrationGenerate')}
      </PrimaryButton>

      {status === 'READY' || article.audioMediaId ? (
        <GhostButton
          type="button"
          className="w-full text-xs"
          disabled={clearMutation.isPending}
          onClick={() => clearMutation.mutate()}
        >
          <Trash2 className="size-3.5" />
          {t('cms.editor.narrationDelete')}
        </GhostButton>
      ) : null}

      {narrateMutation.isError ? (
        <p className="text-xs text-rose-700">
          {(narrateMutation.error as ApiError)?.message ||
            t('cms.editor.narrationFailed')}
        </p>
      ) : null}
    </CmsCard>
  )
}
