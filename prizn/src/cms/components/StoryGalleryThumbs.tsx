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
  horizontalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Film, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type GalleryThumbItem = {
  id: string
  url: string
  file?: File
  kind?: 'image' | 'video'
  posterUrl?: string
}

export function StoryGalleryThumbs({
  items,
  layout,
  activeId,
  heroLabel,
  newLabel,
  removeLabel,
  dragLabel,
  onReorder,
  onSelect,
  onRemove,
}: {
  items: GalleryThumbItem[]
  layout: 'strip' | 'grid'
  activeId?: string
  heroLabel: string
  newLabel: string
  removeLabel: string
  dragLabel: string
  onReorder: (from: number, to: number) => void
  onSelect: (index: number) => void
  onRemove: (id: string) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = items.findIndex((item) => item.id === active.id)
    const to = items.findIndex((item) => item.id === over.id)
    if (from < 0 || to < 0) return
    onReorder(from, to)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={
          layout === 'strip'
            ? horizontalListSortingStrategy
            : rectSortingStrategy
        }
      >
        <div
          className={
            layout === 'strip'
              ? 'flex w-max gap-2'
              : 'grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4'
          }
        >
          {items.map((item, index) => (
            <SortableThumb
              key={item.id}
              item={item}
              index={index}
              layout={layout}
              active={item.id === activeId}
              heroLabel={heroLabel}
              newLabel={newLabel}
              removeLabel={removeLabel}
              dragLabel={dragLabel}
              onSelect={() => onSelect(index)}
              onRemove={() => onRemove(item.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortableThumb({
  item,
  index,
  layout,
  active,
  heroLabel,
  newLabel,
  removeLabel,
  dragLabel,
  onSelect,
  onRemove,
}: {
  item: GalleryThumbItem
  index: number
  layout: 'strip' | 'grid'
  active: boolean
  heroLabel: string
  newLabel: string
  removeLabel: string
  dragLabel: string
  onSelect: () => void
  onRemove: () => void
}) {
  const isHero = index === 0
  const isVideo = item.kind === 'video'
  const thumbSrc = item.posterUrl || item.url
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(isDragging && 'z-20')}
    >
      <button
        type="button"
        data-testid={`gallery-thumb-${index}`}
        aria-label={isHero ? `${heroLabel}. ${dragLabel}` : dragLabel}
        onClick={onSelect}
        className={cn(
          'group relative overflow-hidden rounded-lg border-2 bg-stone-100 text-left transition',
          layout === 'strip' ? 'h-16 w-20 shrink-0' : 'aspect-square max-h-44 w-full',
          isHero
            ? 'border-[#0C2686] ring-2 ring-[#0C2686]/35 ring-offset-2 ring-offset-white'
            : active
              ? 'border-[#0C2686]/70'
              : 'border-transparent opacity-80 hover:opacity-100',
          isDragging && 'cursor-grabbing opacity-100 shadow-lg',
        )}
        {...attributes}
        {...listeners}
      >
        <img
          src={thumbSrc}
          alt=""
          className={cn(
            'pointer-events-none h-full w-full object-cover',
            item.file && 'ring-1 ring-amber-400/70',
            isVideo && !item.posterUrl && 'bg-stone-900 object-contain',
          )}
        />
        {isVideo && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
            <Film className="size-4 text-white drop-shadow" />
          </span>
        )}
        {item.file && (
          <span className="absolute inset-x-0 top-0 bg-amber-400/90 py-0.5 text-center text-[8px] font-semibold uppercase text-[#1A1A1A]">
            {newLabel}
          </span>
        )}
        {isHero && (
          <span
            className={cn(
              'absolute bg-[#0C2686] text-center text-[9px] font-semibold uppercase tracking-wider text-white',
              layout === 'strip'
                ? 'inset-x-0 bottom-0 py-0.5'
                : 'left-2 top-2 rounded-md px-2 py-0.5',
            )}
          >
            {heroLabel}
          </span>
        )}
        <span
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              event.stopPropagation()
              onRemove()
            }
          }}
          className={cn(
            'absolute right-1 top-1 rounded-md bg-white/95 p-1 text-stone-600 shadow-sm',
            layout === 'grid'
              ? 'opacity-0 transition-opacity group-hover:opacity-100'
              : 'opacity-0 group-hover:opacity-100',
          )}
          title={removeLabel}
        >
          <X className="size-3" />
        </span>
      </button>
    </div>
  )
}
