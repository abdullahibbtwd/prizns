import { LayoutGrid } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ArticleImageCollage } from '@/components/concept-3/ArticleImageCollage'
import { GhostButton } from '@/cms/components/CmsUI'
import {
  collageLayoutIds,
  resolveCollageLayout,
} from '@/lib/article-image-collage'
import { cn } from '@/lib/utils'

type CollageItem = {
  mediaId?: string
  url?: string
  captionBg: string
}

export function StoryCollageEditor({
  items,
  layout,
  captionBg,
  onLayoutChange,
  onCaptionChange,
  onUngroup,
  onFocus,
}: {
  items: CollageItem[]
  layout: string
  captionBg: string
  onLayoutChange: (layout: string) => void
  onCaptionChange: (caption: string) => void
  onUngroup: () => void
  onFocus: () => void
}) {
  const { t } = useTranslation()
  const slides = items
    .filter((item) => item.url)
    .map((item, index) => ({
      block: { type: 'image' as const, url: item.url!, textBg: item.captionBg },
      index,
      caption: item.captionBg,
      alt: item.captionBg || '',
    }))
  const count = slides.length
  const layouts = collageLayoutIds(count)
  const current = resolveCollageLayout(count, layout)

  return (
    <div className="space-y-3" data-testid="story-collage-editor">
      {slides.length >= 2 ? (
        <ArticleImageCollage
          items={slides}
          openLabel=""
          layout={current}
          density="editor"
        />
      ) : null}

      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0C2686]/70">
          {t('cms.editor.collageLayout')}
        </p>
        <div className="flex flex-wrap gap-2">
          {layouts.map((id) => (
            <button
              key={id}
              type="button"
              data-testid={`collage-layout-${id}`}
              aria-pressed={current === id}
              aria-label={t(`cms.editor.collageLayout_${id}`)}
              onClick={() => onLayoutChange(id)}
              className={cn(
                'w-16 overflow-hidden rounded-md border bg-[#FAF8F3] p-0.5 transition',
                current === id
                  ? 'border-[#0C2686] ring-2 ring-[#0C2686]/25'
                  : 'border-[#E8E4DC] hover:border-[#0C2686]/40',
              )}
            >
              <ArticleImageCollage
                items={slides}
                openLabel=""
                layout={id}
                density="thumb"
              />
            </button>
          ))}
        </div>
      </div>

      <input
        placeholder={t('cms.editor.collageCaption')}
        className="w-full bg-transparent text-sm outline-none"
        value={captionBg}
        onChange={(event) => onCaptionChange(event.target.value)}
        onFocus={onFocus}
      />

      <GhostButton type="button" className="px-3 py-1.5 text-xs" onClick={onUngroup}>
        <LayoutGrid className="size-3.5" /> {t('cms.editor.collageUngroup')}
      </GhostButton>
    </div>
  )
}
