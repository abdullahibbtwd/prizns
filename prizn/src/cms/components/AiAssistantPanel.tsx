import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import { CmsCard, GhostButton, PrimaryButton } from '@/cms/components/CmsUI'
import { suggestCmsAi, type AiSuggestionResult } from '@/lib/ai-api'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

type AiAssistantPanelProps = {
  articleId?: string
  titleBg: string
  subtitleBg: string
  section: string
  bodyText: string
  locationBg?: string
  categoryBg?: string
  lang: 'bg' | 'en'
  onApply: (patch: {
    titleBg?: string
    subtitleBg?: string
    seoTitleBg?: string
    seoDescriptionBg?: string
  }) => void
}

export function AiAssistantPanel({
  articleId,
  titleBg,
  subtitleBg,
  section,
  bodyText,
  locationBg,
  categoryBg,
  lang,
  onApply,
}: AiAssistantPanelProps) {
  const { t } = useTranslation()
  const [result, setResult] = useState<AiSuggestionResult | null>(null)
  const [selectedHeadline, setSelectedHeadline] = useState(0)

  const canSuggest = Boolean(titleBg.trim() || bodyText.trim())

  const suggestMutation = useMutation({
    mutationFn: () =>
      suggestCmsAi({
        articleId,
        titleBg: titleBg.trim() || t('cms.editor.untitled'),
        subtitleBg,
        section,
        bodyText,
        locationBg,
        categoryBg,
        lang,
      }),
    onSuccess: (data) => {
      setResult(data)
      setSelectedHeadline(0)
    },
  })

  return (
    <CmsCard className="space-y-3 p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-[#0C2686]" />
        <h3 className="text-sm font-semibold">{t('cms.editor.aiTitle')}</h3>
      </div>
      <p className="text-[11px] leading-relaxed text-stone-500">
        {t('cms.editor.aiHint')}
      </p>

      <PrimaryButton
        type="button"
        className="w-full"
        disabled={suggestMutation.isPending || !canSuggest}
        onClick={() => suggestMutation.mutate()}
      >
        <Sparkles className="size-3.5" />
        {suggestMutation.isPending
          ? t('cms.editor.aiGenerating')
          : t('cms.editor.aiSuggest')}
      </PrimaryButton>

      {suggestMutation.isError ? (
        <p className="text-xs text-rose-700">
          {(suggestMutation.error as ApiError)?.message ||
            t('cms.editor.aiFailed')}
        </p>
      ) : null}

      {result ? (
        <div className="space-y-3 border-t border-[#E8E4DC] pt-3">
          {result.headlines.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                {t('cms.editor.aiHeadlines')}
              </p>
              {result.headlines.map((headline, index) => (
                <button
                  key={`${headline}-${index}`}
                  type="button"
                  onClick={() => setSelectedHeadline(index)}
                  className={cn(
                    'w-full rounded-xl border px-3 py-2 text-left text-xs transition-colors',
                    selectedHeadline === index
                      ? 'border-[#0C2686] bg-[#0C2686]/5 text-stone-900'
                      : 'border-[#E8E4DC] bg-stone-50 text-stone-700 hover:border-[#0C2686]/40',
                  )}
                >
                  {headline}
                </button>
              ))}
              <GhostButton
                type="button"
                className="w-full text-xs"
                onClick={() =>
                  onApply({ titleBg: result.headlines[selectedHeadline] })
                }
              >
                {t('cms.editor.aiApplyTitle')}
              </GhostButton>
            </div>
          ) : null}

          {result.subtitle ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                {t('cms.editor.aiLead')}
              </p>
              <p className="rounded-xl border border-[#E8E4DC] bg-stone-50 px-3 py-2 text-xs text-stone-700">
                {result.subtitle}
              </p>
              <GhostButton
                type="button"
                className="w-full text-xs"
                onClick={() => onApply({ subtitleBg: result.subtitle! })}
              >
                {t('cms.editor.aiApplyLead')}
              </GhostButton>
            </div>
          ) : null}

          {result.seoTitle || result.seoDescription ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                {t('cms.editor.aiSeo')}
              </p>
              {result.seoTitle ? (
                <p className="text-xs text-stone-700">
                  <span className="font-semibold">Title: </span>
                  {result.seoTitle}
                </p>
              ) : null}
              {result.seoDescription ? (
                <p className="text-xs text-stone-600">{result.seoDescription}</p>
              ) : null}
              <GhostButton
                type="button"
                className="w-full text-xs"
                onClick={() =>
                  onApply({
                    seoTitleBg: result.seoTitle || undefined,
                    seoDescriptionBg: result.seoDescription || undefined,
                  })
                }
              >
                {t('cms.editor.aiApplySeo')}
              </GhostButton>
            </div>
          ) : null}

          {result.topicTags.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                {t('cms.editor.aiTags')}
              </p>
              <p className="text-xs text-stone-600">
                {result.topicTags.join(' · ')}
              </p>
              <p className="text-[10px] text-stone-400">
                {t('cms.editor.aiTagsHint')}
              </p>
            </div>
          ) : null}

          {result.episodeOutline.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                {t('cms.editor.aiEpisodes')}
              </p>
              <ol className="list-decimal space-y-1 pl-4 text-xs text-stone-600">
                {result.episodeOutline.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>
          ) : null}

          {result.summary ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                {t('cms.editor.aiSummary')}
              </p>
              <p className="text-xs text-stone-600">{result.summary}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </CmsCard>
  )
}
