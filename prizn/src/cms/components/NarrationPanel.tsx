import { useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Headphones, Loader2, RotateCcw, Sparkles, Trash2, Upload } from 'lucide-react'
import { useCmsConfirm } from '@/cms/components/CmsConfirmDialog'
import { CmsCard, GhostButton, PrimaryButton, StatusPill } from '@/cms/components/CmsUI'
import { queueArticleNarration } from '@/lib/articles-api'
import type { CmsArticle } from '@/lib/cms-types'
import { ApiError } from '@/lib/api'

/** Unsaved audio edit in the story editor: a picked file, or a removal. */
export type AudioChange = 'none' | 'added' | 'removed'

type NarrationPanelProps = {
  /** Unset until the story's first save — AI generation needs a saved story. */
  articleId?: string | null
  article?: CmsArticle
  /** Current audio: local preview for a picked file, otherwise the saved audio. */
  audioUrl?: string
  audioChange: AudioChange
  /** True when the draft has Bulgarian text worth narrating. */
  hasText?: boolean
  /** Editor has unsaved text edits (generation reads the saved story). */
  textUnsaved?: boolean
  /** Voices stories manage their recording in the main audio card instead. */
  allowUpload?: boolean
  preparing?: boolean
  error?: string | null
  onUpload: (file: File) => void | Promise<void>
  onRemove: () => void
  onUndo: () => void
}

export function NarrationPanel({
  articleId,
  article,
  audioUrl,
  audioChange,
  hasText = true,
  textUnsaved = false,
  allowUpload = true,
  preparing = false,
  error,
  onUpload,
  onRemove,
  onUndo,
}: NarrationPanelProps) {
  const { t } = useTranslation()
  const { confirm, dialog } = useCmsConfirm()
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const status = article?.narrationStatus ?? 'IDLE'
  const busy = status === 'PENDING' || status === 'RUNNING'
  const hasAudio = audioChange !== 'removed' && Boolean(audioUrl)

  const narrateMutation = useMutation({
    mutationFn: () => queueArticleNarration(articleId!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cms-article', articleId] })
      await queryClient.invalidateQueries({ queryKey: ['cms-articles'] })
    },
  })

  const generating = busy || narrateMutation.isPending
  const canGenerate =
    Boolean(articleId) && hasText && !generating && audioChange === 'none'

  const requestNarrate = async () => {
    if (!canGenerate) return
    const notes = [
      t('cms.editor.narrationConfirmBody'),
      hasAudio ? t('cms.editor.narrationReplaceWarning') : '',
      textUnsaved ? t('cms.editor.narrationUsesSavedText') : '',
    ].filter(Boolean)
    const ok = await confirm({
      title: t('cms.editor.narrationConfirmTitle'),
      description: notes.join(' '),
      confirmLabel: t('cms.editor.narrationGenerate'),
      cancelLabel: t('cms.editor.cancel'),
      variant: 'default',
    })
    if (!ok) return
    narrateMutation.mutate()
  }

  const sourceLabel =
    audioChange === 'added'
      ? t('cms.editor.narrationSourceNew')
      : status === 'READY'
        ? t('cms.editor.narrationSourceGenerated')
        : t('cms.editor.narrationSourceUploaded')

  return (
    <>
      <CmsCard className="space-y-4 p-5">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Headphones className="size-4 text-[#0C2686]" />
              <h3 className="text-sm font-semibold">{t('cms.editor.narrationTitle')}</h3>
            </div>
            {busy || status === 'FAILED' ? <StatusPill status={status} /> : null}
          </div>
          <p className="text-[11px] leading-relaxed text-stone-500">
            {allowUpload
              ? t('cms.editor.narrationHint')
              : t('cms.editor.narrationHintGenerateOnly')}
          </p>
        </div>

        {audioChange === 'removed' ? (
          <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-medium text-amber-900">
              {t('cms.editor.narrationRemovePending')}
            </p>
            <GhostButton type="button" className="py-1.5 text-xs" onClick={onUndo}>
              <RotateCcw className="size-3.5" />
              {t('cms.editor.narrationUndo')}
            </GhostButton>
          </div>
        ) : hasAudio ? (
          <div
            className={
              audioChange === 'added'
                ? 'space-y-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3'
                : 'space-y-2 rounded-xl border border-[#E8E4DC] bg-[#FAF8F3] p-3'
            }
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-stone-700">{sourceLabel}</span>
              {audioChange === 'added' ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                  {t('cms.editor.narrationUnsaved')}
                </span>
              ) : null}
            </div>
            <audio
              key={audioUrl}
              controls
              src={audioUrl}
              className="w-full"
              preload="metadata"
            />
          </div>
        ) : !generating ? (
          <p className="rounded-xl border border-dashed border-[#E8E4DC] px-3 py-4 text-center text-xs text-stone-400">
            {t('cms.editor.narrationNone')}
          </p>
        ) : null}

        {generating ? (
          <p className="inline-flex items-center gap-1.5 text-[11px] text-stone-500">
            <Loader2 className="size-3 animate-spin" />
            {t('cms.editor.narrationGenerating')}
          </p>
        ) : null}

        {status === 'FAILED' && article?.narrationError ? (
          <p className="text-xs text-rose-700">{article.narrationError}</p>
        ) : null}

        <div className="space-y-2">
          <PrimaryButton
            type="button"
            className="w-full"
            disabled={!canGenerate}
            onClick={() => {
              void requestNarrate()
            }}
          >
            <Sparkles className="size-3.5" />
            {generating
              ? t('cms.editor.narrationGenerating')
              : status === 'READY' && hasAudio
                ? t('cms.editor.narrationRegenerate')
                : t('cms.editor.narrationGenerate')}
          </PrimaryButton>

          {allowUpload ? (
            <>
              <input
                ref={fileInput}
                type="file"
                accept="audio/*"
                className="hidden"
                aria-label={t('cms.editor.narrationUpload')}
                disabled={preparing}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (file) await onUpload(file)
                }}
              />
              <GhostButton
                type="button"
                className="w-full text-xs"
                disabled={preparing || generating}
                onClick={() => fileInput.current?.click()}
              >
                {preparing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Upload className="size-3.5" />
                )}
                {hasAudio ? t('cms.editor.narrationReplaceFile') : t('cms.editor.narrationUpload')}
              </GhostButton>
              {audioChange === 'added' ? (
                <GhostButton type="button" className="w-full text-xs" onClick={onUndo}>
                  <RotateCcw className="size-3.5" />
                  {t('cms.editor.narrationUndo')}
                </GhostButton>
              ) : hasAudio ? (
                <GhostButton
                  type="button"
                  className="w-full text-xs text-rose-700"
                  disabled={generating}
                  onClick={onRemove}
                >
                  <Trash2 className="size-3.5" />
                  {t('cms.editor.narrationRemove')}
                </GhostButton>
              ) : null}
            </>
          ) : null}
        </div>

        {!hasText ? (
          <p className="text-[11px] text-amber-800">{t('cms.editor.narrationNeedText')}</p>
        ) : !articleId ? (
          <p className="text-[11px] text-stone-500">{t('cms.editor.narrationWaitingAutosave')}</p>
        ) : audioChange !== 'none' ? (
          <p className="text-[11px] text-stone-500">{t('cms.editor.narrationSaveFirst')}</p>
        ) : null}

        {error ? <p className="text-xs text-rose-700">{error}</p> : null}
        {narrateMutation.isError ? (
          <p className="text-xs text-rose-700">
            {(narrateMutation.error as ApiError)?.message ||
              t('cms.editor.narrationFailed')}
          </p>
        ) : null}
      </CmsCard>
      {dialog}
    </>
  )
}
