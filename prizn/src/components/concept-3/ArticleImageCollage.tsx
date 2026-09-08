import { Expand } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  collageCellLayout,
  collageGridClass,
  type ImageCollageBlock,
} from '@/lib/article-image-collage'

type CollageSlide = {
  block: ImageCollageBlock
  index: number
  caption: string
  alt: string
}

export function ArticleImageCollage({
  items,
  openLabel,
  onOpenImage,
  layout = 'default',
  density = 'article',
}: {
  items: CollageSlide[]
  openLabel: string
  onOpenImage?: (bodyIndex: number) => void
  layout?: string
  density?: 'article' | 'editor' | 'thumb'
}) {
  const count = items.length
  const uniqueCaptions = [
    ...new Set(items.map((item) => item.caption).filter(Boolean)),
  ]
  const sharedCaption =
    uniqueCaptions.length === 1 ? uniqueCaptions[0] : undefined
  const compact = density !== 'article'

  return (
    <figure
      className={cn(
        'article-collage',
        density === 'article' && 'mx-auto my-8 w-full max-w-[22rem] sm:max-w-[24rem]',
        density === 'editor' && 'mx-auto my-1 w-full max-w-[18rem]',
        density === 'thumb' && 'my-0 w-full',
      )}
      data-testid={density === 'article' ? 'article-collage' : 'editor-collage'}
    >
      <div
        className={cn(
          'overflow-hidden rounded-md bg-[#E8E4DC]',
          collageGridClass(count, layout),
          density === 'thumb' && 'rounded-sm',
        )}
      >
        {items.map((item, index) => {
          const cell = collageCellLayout(count, index, layout)
          const showCellCaption =
            !compact && !sharedCaption && Boolean(item.caption)
          const image = (
            <img
              src={item.block.url}
              alt={item.alt}
              loading="lazy"
              className={cn(
                'absolute inset-0 h-full w-full object-cover',
                !compact &&
                  'transition-transform duration-500 ease-out group-hover:scale-[1.03]',
              )}
            />
          )
          return (
            <div
              key={`${item.block.url}-${item.index}`}
              className={cn(
                'relative overflow-hidden bg-[#1A1A1A]',
                cell.className,
                cell.aspectClass,
              )}
            >
              {onOpenImage ? (
                <button
                  type="button"
                  onClick={() => onOpenImage(item.index)}
                  aria-label={openLabel}
                  className="group relative block h-full w-full cursor-zoom-in print:cursor-default"
                >
                  {image}
                  <span className="pointer-events-none absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 print:hidden">
                    <Expand className="size-3.5 stroke-[1.5]" />
                  </span>
                </button>
              ) : (
                image
              )}
              {showCellCaption ? (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-2.5 pb-2 pt-8 font-sans text-[10px] uppercase tracking-[0.14em] text-white/90">
                  {item.caption}
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
      {sharedCaption && !compact ? (
        <figcaption className="mt-3 text-center font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A]/45">
          {sharedCaption}
        </figcaption>
      ) : null}
    </figure>
  )
}
