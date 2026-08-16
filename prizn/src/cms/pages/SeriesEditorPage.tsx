import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowLeft, GripVertical, Plus, Trash2 } from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
  PrimaryButton,
  StatusPill,
  GhostButton,
} from '@/cms/components/CmsUI'
import { uploadCmsMedia } from '@/lib/articles-api'
import { useCmsConfirm } from '@/cms/components/CmsConfirmDialog'
import {
  createCmsSeries,
  deleteCmsSeries,
  getCmsSeries,
  setCmsSeriesEpisodes,
  updateCmsSeries,
} from '@/lib/cms-content-api'
import type { CmsSeriesEpisode, SeriesFormValues } from '@/lib/cms-types'
import { useJournalLang } from '@/hooks/useJournalLang'
import { pickLang } from '@/lib/pick-lang'
import { JournalSelect } from '@/components/ui/JournalSelect'

const schema = z.object({
  titleBg: z.string().min(1),
  descriptionBg: z.string(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),
  coverMediaId: z.string(),
})

const emptyDefaults: SeriesFormValues = {
  titleBg: '',
  descriptionBg: '',
  status: 'DRAFT',
  coverMediaId: '',
}

const inputClass =
  'w-full rounded-lg border border-[#E8E4DC] bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-[#0C2686]'

function SortableEpisodeRow({
  episode,
  index,
  onRemove,
}: {
  episode: CmsSeriesEpisode
  index: number
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const { lang } = useJournalLang()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: episode.articleId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F3] p-3 ${
        isDragging ? 'z-10 opacity-90 shadow-md' : ''
      }`}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-stone-400 hover:text-stone-700 active:cursor-grabbing"
        aria-label={t('cms.series.reorderHint')}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-5" />
      </button>
      <span className="w-8 text-xs font-bold text-stone-500">{index + 1}</span>
      <div className="min-w-0 flex-1">
        <Link
          to={`/cms/stories/${episode.articleId}`}
          className="block truncate text-sm font-semibold text-stone-900 hover:text-[#0C2686]"
        >
          {pickLang(lang, episode.article.titleEn, episode.article.titleBg)}
        </Link>
        <div className="mt-1">
          <StatusPill status={episode.article.status} />
        </div>
      </div>
      <GhostButton
        type="button"
        className="px-2 py-1.5 text-rose-700"
        onClick={onRemove}
        title={t('cms.series.removeEpisode')}
      >
        <Trash2 className="size-4" />
      </GhostButton>
    </div>
  )
}

export default function CmsSeriesEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { lang } = useJournalLang()
  const { confirm, dialog } = useCmsConfirm()
  const isNew = !id || id === 'new'
  const [coverUrl, setCoverUrl] = useState('')
  const [episodeIds, setEpisodeIds] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [orderDirty, setOrderDirty] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const seriesQuery = useQuery({
    queryKey: ['cms-series-item', id],
    queryFn: () => getCmsSeries(id!),
    enabled: !isNew,
    refetchInterval: (query) => {
      const status = query.state.data?.translationStatus
      return status === 'PENDING' || status === 'RUNNING' ? 3000 : false
    },
  })

  const defaults = useMemo<SeriesFormValues>(() => {
    const series = seriesQuery.data
    if (!series) return emptyDefaults
    return {
      titleBg: series.titleBg,
      descriptionBg: series.descriptionBg,
      status: series.status,
      coverMediaId: series.coverMediaId ?? '',
    }
  }, [seriesQuery.data])

  const form = useForm<SeriesFormValues>({
    resolver: zodResolver(schema),
    values: defaults,
    defaultValues: emptyDefaults,
  })

  useEffect(() => {
    if (!seriesQuery.data) return
    setEpisodeIds(seriesQuery.data.episodes.map((ep) => ep.articleId))
    setCoverUrl(seriesQuery.data.coverMedia?.url ?? '')
    setOrderDirty(false)
  }, [seriesQuery.data])

  const episodeById = useMemo(() => {
    const map = new Map<string, CmsSeriesEpisode>()
    for (const ep of seriesQuery.data?.episodes ?? []) {
      map.set(ep.articleId, ep)
    }
    return map
  }, [seriesQuery.data])

  const saveMutation = useMutation({
    mutationFn: async (values: SeriesFormValues) => {
      const payload = {
        ...values,
        coverMediaId: values.coverMediaId || '',
      }
      if (isNew) return createCmsSeries(payload)
      return updateCmsSeries(id!, payload)
    },
    onSuccess: async (series) => {
      await queryClient.invalidateQueries({ queryKey: ['cms-series'] })
      await queryClient.invalidateQueries({ queryKey: ['cms-series-count'] })
      if (isNew) navigate(`/cms/series/${series.id}`, { replace: true })
      else
        await queryClient.invalidateQueries({
          queryKey: ['cms-series-item', id],
        })
    },
  })

  const episodesMutation = useMutation({
    mutationFn: (articleIds: string[]) => setCmsSeriesEpisodes(id!, articleIds),
    onSuccess: async (series) => {
      setEpisodeIds(series.episodes.map((ep) => ep.articleId))
      setOrderDirty(false)
      await queryClient.invalidateQueries({ queryKey: ['cms-series'] })
      await queryClient.invalidateQueries({
        queryKey: ['cms-series-item', id],
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteCmsSeries(id!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cms-series'] })
      await queryClient.invalidateQueries({ queryKey: ['cms-series-count'] })
      navigate('/cms/series')
    },
  })

  const confirmDelete = async () => {
    const title =
      form.getValues('titleBg') ||
      seriesQuery.data?.titleBg ||
      t('cms.editor.untitled')
    const ok = await confirm({
      title: t('cms.series.delete'),
      description: t('cms.series.deleteConfirm', { title }),
    })
    if (!ok) return
    deleteMutation.mutate()
  }

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setEpisodeIds((ids) => {
      const oldIndex = ids.indexOf(String(active.id))
      const newIndex = ids.indexOf(String(over.id))
      if (oldIndex < 0 || newIndex < 0) return ids
      setOrderDirty(true)
      return arrayMove(ids, oldIndex, newIndex)
    })
  }

  const handleCoverUpload = async (file: File) => {
    setUploading(true)
    setUploadError(null)
    try {
      const media = await uploadCmsMedia(file)
      form.setValue('coverMediaId', media.id, { shouldDirty: true })
      setCoverUrl(media.url)
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : t('cms.series.uploadFailed'),
      )
    } finally {
      setUploading(false)
    }
  }

  if (!isNew && seriesQuery.isLoading) {
    return <p className="text-sm text-stone-500">{t('cms.series.loading')}</p>
  }

  if (!isNew && seriesQuery.isError) {
    return <p className="text-sm text-rose-700">{t('cms.series.loadFailed')}</p>
  }

  const statusOptions = [
    { value: 'DRAFT', label: t('cms.status.draft') },
    { value: 'ACTIVE', label: t('cms.series.statusActive') },
    { value: 'ARCHIVED', label: t('cms.status.archived') },
  ]

  const displayTitle = pickLang(
    lang,
    seriesQuery.data?.titleEn,
    form.watch('titleBg') || seriesQuery.data?.titleBg,
  )

  const translationStatus = seriesQuery.data?.translationStatus

  return (
    <div>
      <Link
        to="/cms/series"
        className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-stone-600 transition-colors hover:text-[#0C2686]"
      >
        <ArrowLeft className="size-4" />
        {t('cms.series.back')}
      </Link>

      <CmsPageHeader
        title={
          isNew
            ? t('cms.series.newSeries')
            : t('cms.series.editing', {
                title: displayTitle || t('cms.editor.untitled'),
              })
        }
        description={t('cms.series.editorHint')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {!isNew ? (
              <GhostButton
                type="button"
                className="text-rose-700 hover:border-rose-200 hover:bg-rose-50"
                disabled={deleteMutation.isPending || saveMutation.isPending}
                onClick={() => void confirmDelete()}
              >
                <Trash2 className="size-4" />
                {deleteMutation.isPending
                  ? t('cms.series.deleting')
                  : t('cms.series.delete')}
              </GhostButton>
            ) : null}
            <PrimaryButton
              type="button"
              disabled={saveMutation.isPending || deleteMutation.isPending}
              onClick={form.handleSubmit((values) => saveMutation.mutate(values))}
            >
              {saveMutation.isPending
                ? t('cms.series.saving')
                : t('cms.series.save')}
            </PrimaryButton>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          {!isNew && (
            <CmsCard className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">
                    {t('cms.series.episodes')}
                  </h3>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {t('cms.series.reorderHint')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/cms/stories/new?seriesId=${id}`}>
                    <PrimaryButton type="button" className="py-2 text-xs">
                      <Plus className="size-3.5" />
                      {t('cms.series.newEpisode')}
                    </PrimaryButton>
                  </Link>
                  <PrimaryButton
                    type="button"
                    className="py-2 text-xs"
                    disabled={!orderDirty || episodesMutation.isPending}
                    onClick={() => episodesMutation.mutate(episodeIds)}
                  >
                    {episodesMutation.isPending
                      ? t('cms.series.saving')
                      : t('cms.series.saveEpisodes')}
                  </PrimaryButton>
                </div>
              </div>

              {episodeIds.length === 0 ? (
                <p className="text-sm text-stone-500">
                  {t('cms.series.noEpisodes')}
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={onDragEnd}
                >
                  <SortableContext
                    items={episodeIds}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {episodeIds.map((articleId, index) => {
                        const episode = episodeById.get(articleId)
                        if (!episode) return null
                        return (
                          <SortableEpisodeRow
                            key={articleId}
                            episode={episode}
                            index={index}
                            onRemove={() => {
                              setEpisodeIds((ids) =>
                                ids.filter((x) => x !== articleId),
                              )
                              setOrderDirty(true)
                            }}
                          />
                        )
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CmsCard>
          )}

          {saveMutation.isError && (
            <p className="text-sm text-rose-700">{t('cms.series.saveFailed')}</p>
          )}
          {saveMutation.isSuccess && (
            <p className="text-sm text-emerald-700">
              {t('cms.series.saved')}
              {translationStatus === 'PENDING' || translationStatus === 'RUNNING'
                ? ` ${t('cms.editor.translating')}`
                : translationStatus === 'READY'
                  ? ` ${t('cms.editor.translationReady')}`
                  : translationStatus === 'FAILED'
                    ? ` ${t('cms.editor.translationFailed')}`
                    : ''}
            </p>
          )}
        </div>

        <div className="space-y-6">
          <CmsCard className="space-y-4 p-5">
            <h3 className="text-sm font-semibold">{t('cms.series.manageHint')}</h3>
            <label className="block space-y-1 text-xs font-medium text-stone-600">
              <span>{t('cms.series.titleBg')}</span>
              <input className={inputClass} {...form.register('titleBg')} />
            </label>
            <label className="block space-y-1 text-xs font-medium text-stone-600">
              <span>{t('cms.series.descriptionBg')}</span>
              <textarea
                rows={3}
                className={inputClass}
                {...form.register('descriptionBg')}
              />
            </label>
            <div className="space-y-1 text-xs">
              <span>{t('cms.editor.status')}</span>
              <JournalSelect
                name="status"
                label={t('cms.editor.status')}
                placeholder={t('cms.editor.status')}
                options={statusOptions}
                value={form.watch('status')}
                onChange={(value) =>
                  form.setValue('status', value as SeriesFormValues['status'], {
                    shouldDirty: true,
                  })
                }
              />
            </div>
            {!isNew && translationStatus && (
              <div className="space-y-1 text-xs">
                <span className="text-stone-500">
                  {t('cms.stories.colTranslation')}
                </span>
                <StatusPill status={translationStatus} />
              </div>
            )}
          </CmsCard>

          <CmsCard className="space-y-3 p-5">
            <h3 className="text-sm font-semibold">{t('cms.series.cover')}</h3>
            {coverUrl ? (
              <img
                src={coverUrl}
                alt=""
                className="aspect-[4/3] w-full rounded-xl object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-[#E8E4DC] bg-stone-50 text-xs text-stone-500">
                {t('cms.series.coverEmpty')}
              </div>
            )}
            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-[#E8E4DC] bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-white">
              {uploading
                ? t('cms.authors.uploading')
                : t('cms.series.uploadCover')}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleCoverUpload(file)
                  e.target.value = ''
                }}
              />
            </label>
            {form.watch('coverMediaId') && (
              <GhostButton
                type="button"
                className="w-full py-2 text-xs"
                onClick={() => {
                  form.setValue('coverMediaId', '', { shouldDirty: true })
                  setCoverUrl('')
                }}
              >
                {t('cms.series.removeCover')}
              </GhostButton>
            )}
            {uploadError && (
              <p className="text-xs text-rose-700">{uploadError}</p>
            )}
          </CmsCard>
        </div>
      </div>
      {dialog}
    </div>
  )
}
