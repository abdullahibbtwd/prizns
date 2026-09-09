import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Film, GripVertical, ImagePlus, LayoutGrid, Trash2 } from 'lucide-react'
import { StoryRichTextField } from '@/cms/components/StoryRichTextField'
import { sanitizeRichText } from '@/lib/rich-text'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableSyntheticListeners,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GhostButton } from '@/cms/components/CmsUI'
import { StoryCollageEditor } from '@/cms/components/StoryCollageEditor'
import { JournalSelect } from '@/components/ui/JournalSelect'
import {
  convertBodyBlock,
  emptyTextBlock,
  groupImagesIntoCollage,
  mediaIdsFromBodyBlock,
  nextBodyMoveIndex,
  setCollageLayout,
  swapCollageItems,
  toolbarTypeAction,
  ungroupCollage,
  type TextBlockType,
} from '@/cms/pages/story-editor-body'
import type { ArticleFormValues, BodyBlock } from '@/lib/cms-types'
import { cn } from '@/lib/utils'
import { COLLAGE_MAX, COLLAGE_MIN } from '@/lib/article-image-collage'
import { getRemotePosterUrl, resolveVideoPlayback } from '@/lib/video-playback'

const MARK_TYPES: TextBlockType[] = [
  'paragraph',
  'pullquote',
  'note',
  'caption',
]

type GalleryPreview = { id: string; url: string; kind?: 'image' | 'video' }

export function StoryBodyEditor({
  form,
  fields,
  hideFirstParagraph,
  gallery,
  insert,
  update,
  remove,
  move,
  onAddImages,
  replaceBody,
  onDropMediaIds,
}: {
  form: UseFormReturn<ArticleFormValues>
  fields: Array<{ id: string }>
  hideFirstParagraph: boolean
  gallery: GalleryPreview[]
  insert: (index: number, value: BodyBlock) => void
  update: (index: number, value: BodyBlock) => void
  remove: (index: number) => void
  move: (from: number, to: number) => void
  onAddImages: (files: File[], afterIndex: number) => Promise<void>
  replaceBody: (next: BodyBlock[]) => void
  onDropMediaIds?: (mediaIds: string[]) => void
}) {
  const { t } = useTranslation()
  const rootRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const pendingFocus = useRef<number | null>(null)
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const [selected, setSelected] = useState<number[]>([])

  const minIndex = hideFirstParagraph ? 1 : 0
  const heroId = gallery[0]?.id
  const sortableIds = fields
    .map((field, index) => {
      if (index < minIndex) return null
      const mediaId = form.getValues(`body.${index}.mediaId`)
      const type = form.getValues(`body.${index}.type`)
      if (
        (type === 'image' || type === 'video') &&
        heroId &&
        mediaId === heroId
      )
        return null
      return field.id
    })
    .filter((id): id is string => Boolean(id))

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  useLayoutEffect(() => {
    const index = pendingFocus.current
    if (index == null) return
    pendingFocus.current = null
    const el = rootRef.current?.querySelector<HTMLElement>(
      `[data-body-index="${index}"]`,
    )
    el?.focus()
    if (el && window.getSelection) {
      const range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(true)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }, [fields])

  const focusTarget = () => {
    if (focusedIndex != null && focusedIndex >= minIndex) return focusedIndex
    for (let i = fields.length - 1; i >= minIndex; i -= 1) return i
    return minIndex
  }

  const currentType = form.watch(`body.${focusTarget()}.type`)

  const applyToolbarType = (type: TextBlockType) => {
    const index = focusTarget()
    const block = form.getValues(`body.${index}`)
    const noteLabel = t('cms.editor.note')
    const action = toolbarTypeAction(block, type)
    if (action === 'none') {
      setFocusedIndex(index)
      return
    }
    if (action === 'convert' && block && block.type !== 'image' && block.type !== 'video') {
      update(index, convertBodyBlock(block, type, noteLabel))
      pendingFocus.current = index
      setFocusedIndex(index)
      return
    }
    const next = index + 1
    insert(next, emptyTextBlock(type, noteLabel))
    pendingFocus.current = next
    setFocusedIndex(next)
  }

  const changeBlockType = (index: number, type: TextBlockType) => {
    const block = form.getValues(`body.${index}`)
    if (!block || block.type === 'image' || block.type === 'video') return
    update(index, convertBodyBlock(block, type, t('cms.editor.note')))
    pendingFocus.current = index
    setFocusedIndex(index)
  }

  const insertParagraphAfter = (index: number, afterText: string) => {
    const next = index + 1
    insert(next, { type: 'paragraph', textBg: afterText })
    pendingFocus.current = next
    setFocusedIndex(next)
  }

  const onRichSplit = (index: number, afterHtml: string) => {
    insertParagraphAfter(index, afterHtml)
  }

  const removeBlock = (index: number) => {
    const ids = mediaIdsFromBodyBlock(form.getValues(`body.${index}`))
    if (fields.length <= minIndex + 1) {
      update(index, { type: 'paragraph', textBg: '' })
    } else {
      remove(index)
    }
    if (ids.length) onDropMediaIds?.(ids)
    setSelected((prev) =>
      prev.filter((item) => item !== index).map((item) => (item > index ? item - 1 : item)),
    )
  }

  const onRichEmptyBackspace = (index: number) => {
    if (fields.length <= minIndex + 1) return
    const prev = index - 1
    remove(index)
    if (prev >= minIndex) {
      pendingFocus.current = prev
      setFocusedIndex(prev)
    }
  }

  const onRichPasteChunks = (index: number, chunks: string[]) => {
    form.setValue(`body.${index}.textBg`, sanitizeRichText(chunks[0] ?? ''), {
      shouldDirty: true,
    })
    for (let i = 1; i < chunks.length; i += 1) {
      insert(index + i, {
        type: 'paragraph',
        textBg: sanitizeRichText(chunks[i]!),
      })
    }
    pendingFocus.current = index + chunks.length - 1
  }

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = fields.findIndex((field) => field.id === active.id)
    const to = fields.findIndex((field) => field.id === over.id)
    const next = nextBodyMoveIndex(from, to, minIndex)
    if (!next) return
    move(next.from, next.to)
    setFocusedIndex(next.to)
    setSelected([])
  }

  const toggleSelected = (index: number) => {
    setSelected((prev) =>
      prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index],
    )
  }

  const createCollageFromSelection = () => {
    if (selected.length < COLLAGE_MIN || selected.length > COLLAGE_MAX) return
    const next = groupImagesIntoCollage(form.getValues('body'), selected)
    replaceBody(next)
    setSelected([])
  }

  const applyCollageLayout = (index: number, layout: string) => {
    replaceBody(setCollageLayout(form.getValues('body'), index, layout))
  }

  const swapCollagePhotos = (index: number, from: number, to: number) => {
    replaceBody(swapCollageItems(form.getValues('body'), index, from, to))
  }

  const splitCollage = (index: number) => {
    replaceBody(ungroupCollage(form.getValues('body'), index))
    setSelected([])
  }

  const canCollage =
    selected.length >= COLLAGE_MIN && selected.length <= COLLAGE_MAX

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
          {t('cms.editor.markAs')}
        </span>
        {MARK_TYPES.map((type) => (
          <GhostButton
            key={type}
            type="button"
            className={cn(
              'px-3 py-1.5 text-xs',
              currentType === type &&
                'border-[#0C2686] bg-[#0C2686]/5 text-[#0C2686]',
            )}
            onClick={() => applyToolbarType(type)}
          >
            {t(`cms.editor.${type}`)}
          </GhostButton>
        ))}
        <GhostButton
          type="button"
          className="px-3 py-1.5 text-xs"
          onClick={() => imageInputRef.current?.click()}
        >
          <ImagePlus className="size-3.5" /> {t('cms.editor.insertImage')}
        </GhostButton>
        <GhostButton
          type="button"
          className="px-3 py-1.5 text-xs"
          disabled={!canCollage}
          onClick={createCollageFromSelection}
        >
          <LayoutGrid className="size-3.5" /> {t('cms.editor.collageCreate')}
        </GhostButton>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={async (event) => {
            const files = [...(event.target.files ?? [])]
            event.target.value = ''
            if (files.length === 0) return
            await onAddImages(files, focusTarget())
          }}
        />
      </div>

      <p className="text-[11px] text-stone-500">{t('cms.editor.bodyEditorHint')}</p>
      {selected.length > 0 ? (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#0C2686]/20 bg-[#0C2686]/5 px-3 py-2"
          data-testid="collage-selection-bar"
        >
          <span className="text-xs font-medium text-[#0C2686]">
            {t('cms.editor.collageSelected', { count: selected.length })}
          </span>
          <div className="flex gap-2">
            <GhostButton
              type="button"
              className="px-3 py-1.5 text-xs"
              onClick={() => setSelected([])}
            >
              {t('cms.editor.cancel')}
            </GhostButton>
            <GhostButton
              type="button"
              className="border-[#0C2686] bg-[#0C2686] px-3 py-1.5 text-xs text-white hover:bg-[#0C2686]"
              disabled={!canCollage}
              onClick={createCollageFromSelection}
            >
              <LayoutGrid className="size-3.5" /> {t('cms.editor.collageCreate')}
            </GhostButton>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-stone-400">{t('cms.editor.collageHint')}</p>
      )}

      <div ref={rootRef} className="rounded-xl border border-[#E8E4DC] bg-white">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={sortableIds}
            strategy={verticalListSortingStrategy}
          >
            {fields.map((field, index) => {
              const type = form.watch(`body.${index}.type`)
              if (hideFirstParagraph && index === 0 && type === 'paragraph') {
                return null
              }
              const mediaId = form.watch(`body.${index}.mediaId`)
              if (
                (type === 'image' || type === 'video') &&
                heroId &&
                mediaId === heroId
              ) {
                return null
              }

              const mediaUrl =
                type === 'image' || type === 'video'
                  ? form.watch(`body.${index}.url`) ||
                    gallery.find(
                      (item) => item.id === form.watch(`body.${index}.mediaId`),
                    )?.url
                  : ''

              return (
                <SortableBodyRow
                  key={field.id}
                  id={field.id}
                  index={index}
                  type={type}
                  focused={focusedIndex === index}
                  dragLabel={t('cms.editor.dragBlock')}
                >
                  {(dragListeners) => (
                    <>
                      <div className="mb-1 flex min-w-0 flex-1 items-center justify-between">
                        {type === 'image' || type === 'video' || type === 'collage' ? (
                          <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0C2686]/70">
                            {type === 'video'
                              ? t('cms.editor.videoMedia')
                              : type === 'collage'
                                ? t('cms.editor.collageGroup')
                                : t('cms.editor.image')}
                          </span>
                        ) : (
                          <JournalSelect
                            name={`body-type-${index}`}
                            size="sm"
                            ariaLabel={t('cms.editor.changeBlockType')}
                            value={type}
                            options={MARK_TYPES.map((blockType) => ({
                              value: blockType,
                              label: t(`cms.editor.${blockType}`),
                            }))}
                            onChange={(next) => {
                              setFocusedIndex(index)
                              changeBlockType(index, next as TextBlockType)
                            }}
                            className="z-20 w-auto"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => removeBlock(index)}
                          className="text-stone-400 opacity-0 transition hover:text-rose-700 group-hover:opacity-100 group-focus-within:opacity-100"
                          aria-label={t('cms.editor.removeBlock')}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>

                      {type === 'collage' ? (
                        <StoryCollageEditor
                          items={(form.watch(`body.${index}.items`) ?? []).map(
                            (item) => ({
                              ...item,
                              url:
                                item.url ||
                                gallery.find((entry) => entry.id === item.mediaId)
                                  ?.url,
                            }),
                          )}
                          layout={form.watch(`body.${index}.layout`) || 'mosaic'}
                          captionBg={form.watch(`body.${index}.captionBg`) ?? ''}
                          onLayoutChange={(layout) =>
                            applyCollageLayout(index, layout)
                          }
                          onCaptionChange={(caption) => {
                            const current = form.getValues(`body.${index}`)
                            if (current.type !== 'collage') return
                            update(index, { ...current, captionBg: caption })
                          }}
                          onUngroup={() => splitCollage(index)}
                          onSwap={(from, to) => swapCollagePhotos(index, from, to)}
                          onFocus={() => setFocusedIndex(index)}
                        />
                      ) : type === 'image' || type === 'video' ? (
                        <>
                          {mediaUrl ? (
                            <div className="mb-2 flex items-start gap-2">
                              {type === 'image' ? (
                                <label className="mt-2 inline-flex shrink-0 items-center">
                                  <input
                                    type="checkbox"
                                    data-testid={`collage-select-${index}`}
                                    checked={selected.includes(index)}
                                    onChange={() => toggleSelected(index)}
                                    className="size-4 rounded border-[#E8E4DC] text-[#0C2686]"
                                    aria-label={t('cms.editor.collageMark')}
                                  />
                                </label>
                              ) : null}
                              <div
                                className="min-w-0 flex-1 cursor-grab touch-none active:cursor-grabbing"
                                {...dragListeners}
                              >
                                {type === 'video' ? (
                                  <BodyVideoPreview url={mediaUrl} />
                                ) : (
                                  <img
                                    src={mediaUrl}
                                    alt=""
                                    className={cn(
                                      'pointer-events-none max-h-56 w-full rounded-md object-cover',
                                      selected.includes(index) &&
                                        'ring-2 ring-[#0C2686] ring-offset-2',
                                    )}
                                  />
                                )}
                              </div>
                            </div>
                          ) : null}
                          <input
                            placeholder={
                              type === 'video'
                                ? t('cms.editor.videoCaption')
                                : t('cms.editor.imageCaption')
                            }
                            className="w-full bg-transparent text-sm outline-none"
                            {...form.register(`body.${index}.captionBg`)}
                            onFocus={() => setFocusedIndex(index)}
                          />
                        </>
                      ) : (
                        <>
                          {type === 'note' && (
                            <input
                              placeholder={t('cms.editor.labelBg')}
                              className="mb-1 w-full bg-transparent text-xs font-semibold uppercase tracking-wider text-[#0C2686] outline-none"
                              {...form.register(`body.${index}.labelBg`)}
                              onFocus={() => setFocusedIndex(index)}
                            />
                          )}
                          <StoryRichTextField
                            index={index}
                            value={form.watch(`body.${index}.textBg`) ?? ''}
                            placeholder={
                              type === 'paragraph'
                                ? t('cms.editor.writePlaceholder')
                                : t('cms.editor.textBg')
                            }
                            className={
                              type === 'pullquote'
                                ? 'border-l-2 border-[#0C2686] pl-3 font-heading text-base italic'
                                : type === 'caption'
                                  ? 'text-center text-xs uppercase tracking-wider text-stone-500'
                                  : undefined
                            }
                            onChange={(html) =>
                              form.setValue(`body.${index}.textBg`, html, {
                                shouldDirty: true,
                              })
                            }
                            onFocus={() => setFocusedIndex(index)}
                            onSplit={(after) => onRichSplit(index, after)}
                            onEmptyBackspace={() => onRichEmptyBackspace(index)}
                            onPasteChunks={(chunks) =>
                              onRichPasteChunks(index, chunks)
                            }
                          />
                          {type === 'pullquote' && (
                            <input
                              placeholder={t('cms.editor.citeBg')}
                              className="mt-2 w-full bg-transparent text-xs uppercase tracking-wider text-[#0C2686] outline-none"
                              {...form.register(`body.${index}.citeBg`)}
                              onFocus={() => setFocusedIndex(index)}
                            />
                          )}
                        </>
                      )}
                    </>
                  )}
                </SortableBodyRow>
              )
            })}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}

function SortableBodyRow({
  id,
  index,
  type,
  focused,
  dragLabel,
  children,
}: {
  id: string
  index: number
  type: BodyBlock['type']
  focused: boolean
  dragLabel: string
  children: (listeners: DraggableSyntheticListeners) => ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'group relative flex gap-2 border-b border-[#E8E4DC] px-3 py-3 last:border-b-0',
        focused && 'bg-[#FAF8F3]',
        isDragging && 'z-10 bg-white shadow-md',
        type === 'image' || type === 'video' || type === 'collage'
          ? 'bg-[#FAF8F3]/80'
          : undefined,
      )}
    >
      <button
        type="button"
        className={cn(
          'mt-1 shrink-0 cursor-grab touch-none text-stone-300 hover:text-stone-600 active:cursor-grabbing',
          type === 'image' || type === 'video' || type === 'collage'
            ? 'text-stone-500'
            : undefined,
        )}
        aria-label={dragLabel}
        data-testid={`drag-block-${index}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1">{children(listeners)}</div>
    </div>
  )
}

function BodyVideoPreview({ url }: { url: string }) {
  const poster = getRemotePosterUrl(url)
  if (poster) {
    return (
      <div className="relative overflow-hidden rounded-md bg-stone-900">
        <img
          src={poster}
          alt=""
          className="pointer-events-none max-h-56 w-full object-cover"
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
          <Film className="size-8 text-white drop-shadow" />
        </span>
      </div>
    )
  }
  const playback = resolveVideoPlayback(url)
  if (playback?.kind === 'youtube' || playback?.kind === 'vimeo') {
    return (
      <div className="relative flex aspect-video max-h-56 items-center justify-center overflow-hidden rounded-md bg-stone-900">
        <Film className="size-8 text-white/80" />
      </div>
    )
  }
  return (
    <div className="relative overflow-hidden rounded-md bg-black">
      <video
        src={url}
        className="pointer-events-none max-h-56 w-full object-contain"
        muted
        playsInline
        preload="metadata"
      />
      <Film className="pointer-events-none absolute left-2 top-2 size-4 text-white/80" />
    </div>
  )
}
