import { Expand } from 'lucide-react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import {
  collageCellLayout,
  collageColsClass,
  collageGridClass,
  collageShellClass,
  collageTemplate,
  isSplitCollageLayout,
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
  onSwap,
  layout = 'mosaic',
  density = 'article',
}: {
  items: CollageSlide[]
  openLabel: string
  onOpenImage?: (bodyIndex: number) => void
  onSwap?: (from: number, to: number) => void
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
  const sortable = Boolean(onSwap) && density === 'editor'
  const cellIds = items.map((_, index) => `collage-cell-${index}`)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const onDragEnd = (event: DragEndEvent) => {
    if (!onSwap) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = cellIds.indexOf(String(active.id))
    const to = cellIds.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    onSwap(from, to)
  }

  const template = collageTemplate(layout)
  const split = isSplitCollageLayout(layout)
  const [hero, ...rest] = items

  const renderCell = (item: CollageSlide, index: number, extraClass?: string) => {
    const props = {
      item,
      index,
      count,
      layout,
      compact,
      sharedCaption,
      openLabel,
      onOpenImage,
      extraClass,
    }
    return sortable ? (
      <SortableCollageCell key={cellIds[index]} id={cellIds[index]!} {...props} />
    ) : (
      <StaticCollageCell key={`${item.block.url}-${index}`} {...props} />
    )
  }

  const board =
    split && hero ? (
      <div
        className={cn(
          'overflow-hidden rounded-md bg-[#E8E4DC]',
          density === 'thumb' && 'rounded-sm',
        )}
      >
        {renderCell(
          hero,
          0,
          'aspect-[16/9] w-full',
        )}
        {rest.length > 0 ? (
          template === 'filmstrip' ? (
            <div className="mt-[2px] flex gap-[2px] overflow-x-auto [scrollbar-width:thin]">
              {rest.map((item, index) =>
                renderCell(
                  item,
                  index + 1,
                  'aspect-square w-[22%] min-w-[2.75rem] shrink-0',
                ),
              )}
            </div>
          ) : (
            <div
              className={cn(
                'mt-[2px] grid gap-[2px]',
                collageColsClass(rest.length),
              )}
            >
              {rest.map((item, index) =>
                renderCell(item, index + 1, 'aspect-square'),
              )}
            </div>
          )
        ) : null}
      </div>
    ) : (
      <div
        className={cn(
          'overflow-hidden rounded-md bg-[#E8E4DC]',
          collageGridClass(count, layout),
          density === 'thumb' && 'rounded-sm',
        )}
      >
        {items.map((item, index) => renderCell(item, index))}
      </div>
    )

  return (
    <figure
      className={cn('article-collage', collageShellClass(layout, density))}
      data-testid={density === 'article' ? 'article-collage' : 'editor-collage'}
      data-collage-layout={template}
    >
      {sortable ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={cellIds} strategy={rectSortingStrategy}>
            {board}
          </SortableContext>
        </DndContext>
      ) : (
        board
      )}
      {sharedCaption && !compact ? (
        <figcaption className="mt-3 text-center font-sans text-xs uppercase tracking-[0.16em] text-[#1A1A1A]/45">
          {sharedCaption}
        </figcaption>
      ) : null}
    </figure>
  )
}

function collageImage(
  item: CollageSlide,
  compact: boolean,
  zoomOnHover: boolean,
) {
  return (
    <img
      src={item.block.url}
      alt={item.alt}
      loading="lazy"
      className={cn(
        'absolute inset-0 h-full w-full object-cover',
        zoomOnHover &&
          !compact &&
          'transition-transform duration-500 ease-out group-hover:scale-[1.03]',
      )}
    />
  )
}

function CellChrome({
  item,
  count: _count,
  layout: _layout,
  compact,
  sharedCaption,
  openLabel,
  onOpenImage,
  zoomOnHover,
}: {
  item: CollageSlide
  index: number
  count: number
  layout: string
  compact: boolean
  sharedCaption?: string
  openLabel: string
  onOpenImage?: (bodyIndex: number) => void
  zoomOnHover: boolean
}) {
  const showCellCaption = !compact && !sharedCaption && Boolean(item.caption)
  const image = collageImage(item, compact, zoomOnHover)
  return (
    <>
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
    </>
  )
}

function StaticCollageCell(props: {
  item: CollageSlide
  index: number
  count: number
  layout: string
  compact: boolean
  sharedCaption?: string
  openLabel: string
  onOpenImage?: (bodyIndex: number) => void
  extraClass?: string
}) {
  const cell = collageCellLayout(props.count, props.index, props.layout)
  return (
    <div
      data-testid={`collage-cell-${props.index}`}
      className={cn(
        'relative overflow-hidden bg-[#1A1A1A]',
        props.extraClass ?? cn(cell.className, cell.aspectClass),
      )}
    >
      <CellChrome {...props} zoomOnHover />
    </div>
  )
}

function SortableCollageCell({
  id,
  extraClass,
  ...props
}: {
  id: string
  item: CollageSlide
  index: number
  count: number
  layout: string
  compact: boolean
  sharedCaption?: string
  openLabel: string
  onOpenImage?: (bodyIndex: number) => void
  extraClass?: string
}) {
  const cell = collageCellLayout(props.count, props.index, props.layout)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      data-testid={`collage-cell-${props.index}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 2 : undefined,
      }}
      className={cn(
        'relative overflow-hidden bg-[#1A1A1A] cursor-grab touch-none active:cursor-grabbing',
        extraClass ?? cn(cell.className, cell.aspectClass),
        isDragging && 'opacity-40',
        isOver && !isDragging && 'ring-2 ring-inset ring-white/80',
      )}
      onPointerDown={(event) => event.stopPropagation()}
      {...attributes}
      {...listeners}
    >
      <CellChrome {...props} zoomOnHover={false} />
    </div>
  )
}
