import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  Film,
  Headphones,
  ImagePlus,
  LayoutGrid,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
  GhostButton,
  PrimaryButton,
  StatusPill,
} from '@/cms/components/CmsUI'
import { JournalSelect } from '@/components/ui/JournalSelect'
import {
  createCmsArticle,
  createCmsAuthor,
  getCmsArticle,
  listCmsAuthors,
  updateCmsArticle,
  uploadCmsMedia,
} from '@/lib/articles-api'
import {
  createCmsSeries,
  listCmsSeries,
} from '@/lib/cms-content-api'
import {
  ARTICLE_SECTIONS,
  type ArticleFormValues,
  type ArticleSection,
  type BodyBlock,
} from '@/lib/cms-types'
import { ApiError } from '@/lib/api'
import { useJournalLang } from '@/hooks/useJournalLang'
import { pickLang } from '@/lib/pick-lang'
import { cn } from '@/lib/utils'
import { getSectionProfile } from '@/cms/section-profiles'
import {
  captureVideoPosterBlob,
  formatWatchDuration,
  getRemotePosterUrl,
  resolveVideoPlayback,
} from '@/lib/video-playback'

const blockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('paragraph'),
    textBg: z.string().min(1),
  }),
  z.object({
    type: z.literal('pullquote'),
    textBg: z.string().min(1),
    citeBg: z.string().min(1),
  }),
  z.object({
    type: z.literal('note'),
    labelBg: z.string().min(1),
    textBg: z.string().min(1),
  }),
  z.object({
    type: z.literal('caption'),
    textBg: z.string().min(1),
  }),
])

const schema = z.object({
  section: z.enum([
    'featured',
    'human-stories',
    'places',
    'traditions',
    'discover',
    'voices',
    'sports',
    'events',
    'video',
    'campaigns',
    'gallery',
  ]),
  status: z.enum(['DRAFT', 'REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']),
  categoryBg: z.string().min(1),
  titleBg: z.string().min(1),
  subtitleBg: z.string(),
  readTimeMinutes: z.coerce.number().min(1).max(180),
  readTimeUnit: z.enum(['minutes', 'hours']),
  locationBg: z.string(),
  dateIso: z.string(),
  photoCreditBg: z.string(),
  endLabelBg: z.string(),
  speakerBg: z.string(),
  audioDuration: z.string(),
  authorId: z.string(),
  galleryMediaIds: z.array(z.string()),
  audioMediaId: z.string(),
  videoUrl: z.string(),
  videoMediaId: z.string(),
  featured: z.boolean(),
  sponsored: z.boolean(),
  sponsorName: z.string(),
  body: z.array(blockSchema).min(1),
  seriesMode: z.enum(['standalone', 'series']),
  seriesId: z.string(),
})

const emptyDefaults: ArticleFormValues = {
  section: 'human-stories',
  status: 'DRAFT',
  categoryBg: 'Човешки истории',
  titleBg: '',
  subtitleBg: '',
  readTimeMinutes: 5,
  readTimeUnit: 'minutes',
  locationBg: '',
  dateIso: '',
  photoCreditBg: '',
  endLabelBg: 'Край',
  speakerBg: '',
  audioDuration: '',
  authorId: '',
  galleryMediaIds: [],
  audioMediaId: '',
  videoUrl: '',
  videoMediaId: '',
  featured: false,
  sponsored: false,
  sponsorName: '',
  body: [{ type: 'paragraph', textBg: '' }],
  seriesMode: 'standalone',
  seriesId: '',
}

function ensureTeaserParagraph(body: BodyBlock[]): BodyBlock[] {
  if (body[0]?.type === 'paragraph') return body
  return [{ type: 'paragraph', textBg: '' }, ...body]
}

function parseReadTime(value?: string | null): {
  amount: number
  unit: 'minutes' | 'hours'
} {
  const match = value?.match(
    /(\d+)\s*(часа|час|hours?|минути|минута|мин\.?|minutes?|mins?\.?)/i,
  )
  if (!match) return { amount: 5, unit: 'minutes' }
  const amount = Number(match[1]) || 5
  const unitToken = match[2].toLowerCase()
  const unit =
    unitToken.startsWith('час') || unitToken.startsWith('hour')
      ? 'hours'
      : 'minutes'
  return { amount, unit }
}

function formatReadTimeBg(amount: number, unit: 'minutes' | 'hours') {
  const n = Math.max(1, amount)
  if (unit === 'hours') {
    return n === 1 ? '1 час' : `${n} часа`
  }
  return n === 1 ? '1 минута' : `${n} минути`
}

function formatDateBg(iso: string) {
  if (!iso) return ''
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('bg-BG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

type GalleryItem = { id: string; url: string; uploading?: boolean }

export default function CmsStoryEditorPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { lang } = useJournalLang()
  const basePath = '/cms/stories'
  const isNew = !id || id === 'new'
  const querySeriesId = searchParams.get('seriesId') || ''
  const [gallery, setGallery] = useState<GalleryItem[]>([])
  const [activeSlide, setActiveSlide] = useState(0)
  const [galleryView, setGalleryView] = useState<'slider' | 'grid'>('slider')
  const [showAuthorForm, setShowAuthorForm] = useState(false)
  const [newAuthorName, setNewAuthorName] = useState('')
  const [showCreateSeries, setShowCreateSeries] = useState(false)
  const [newSeriesTitle, setNewSeriesTitle] = useState('')
  const [videoUploading, setVideoUploading] = useState(false)
  const [posterBusy, setPosterBusy] = useState(false)
  const [linkPreviewOpen, setLinkPreviewOpen] = useState(false)
  const [audioUrl, setAudioUrl] = useState('')
  const [audioUploading, setAudioUploading] = useState(false)

  const articleQuery = useQuery({
    queryKey: ['cms-article', id],
    queryFn: () => getCmsArticle(id!),
    enabled: !isNew,
    refetchInterval: (query) => {
      const status = query.state.data?.translationStatus
      return status === 'PENDING' || status === 'RUNNING' ? 2000 : false
    },
  })

  const authorsQuery = useQuery({
    queryKey: ['cms-authors'],
    queryFn: listCmsAuthors,
  })

  const seriesListQuery = useQuery({
    queryKey: ['cms-series'],
    queryFn: listCmsSeries,
  })

  useEffect(() => {
    const article = articleQuery.data
    if (!article) return
    setAudioUrl(article.audioUrl ?? '')
    if (article.gallery?.length) {
      setGallery(article.gallery.map((item) => ({ id: item.id, url: item.url })))
      return
    }
    if (article.image && article.heroMediaId) {
      setGallery([{ id: article.heroMediaId, url: article.image }])
    }
  }, [articleQuery.data])

  const defaults = useMemo<ArticleFormValues>(() => {
    const article = articleQuery.data
    if (!article) {
      if (isNew && querySeriesId) {
        return {
          ...emptyDefaults,
          seriesMode: 'series',
          seriesId: querySeriesId,
        }
      }
      return emptyDefaults
    }
    const galleryIds =
      article.galleryMediaIds?.length
        ? article.galleryMediaIds
        : article.heroMediaId
          ? [article.heroMediaId]
          : []
    const readTime = parseReadTime(
      article.section === 'video' && article.audioDuration
        ? article.audioDuration
        : article.readTimeBg,
    )
    return {
      section: (article.section === 'human_stories'
        ? 'human-stories'
        : article.section) as ArticleFormValues['section'],
      status: article.status,
      categoryBg: article.categoryBg,
      titleBg: article.titleBg,
      subtitleBg: article.subtitleBg,
      readTimeMinutes: readTime.amount,
      readTimeUnit:
        article.section === 'video' ? 'minutes' : readTime.unit,
      locationBg: article.locationBg,
      dateIso: article.publishedAt?.slice(0, 10) || '',
      photoCreditBg: article.photoCreditBg,
      endLabelBg: article.endLabelBg,
      speakerBg: article.speakerBg ?? '',
      audioDuration: article.audioDuration ?? '',
      authorId: article.authorId ?? '',
      galleryMediaIds: galleryIds,
      audioMediaId: article.audioMediaId ?? '',
      videoUrl: article.videoUrl ?? '',
      videoMediaId: article.videoMediaId ?? '',
      featured: article.featured,
      sponsored: article.sponsored,
      sponsorName: article.sponsorName ?? '',
      body:
        article.bodyRaw && article.bodyRaw.length > 0
          ? article.bodyRaw
          : [{ type: 'paragraph', textBg: '' }],
      seriesMode: article.series ? 'series' : 'standalone',
      seriesId: article.series?.id ?? '',
    }
  }, [articleQuery.data, isNew, querySeriesId])

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(schema) as never,
    values: defaults,
    defaultValues: emptyDefaults,
  })

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'body',
  })

  const section = form.watch('section')
  const seriesMode = form.watch('seriesMode')
  const seriesId = form.watch('seriesId')
  const videoUrlValue = form.watch('videoUrl')
  const videoMediaIdValue = form.watch('videoMediaId')
  const profile = getSectionProfile(section)

  useEffect(() => {
    form.setValue(
      'galleryMediaIds',
      gallery.map((item) => item.id),
      { shouldDirty: true },
    )
  }, [gallery, form])

  const applySection = (next: ArticleSection) => {
    const nextProfile = getSectionProfile(next)
    form.setValue('section', next, { shouldDirty: true })
    form.setValue('categoryBg', nextProfile.defaultCategoryBg, {
      shouldDirty: true,
    })
    if (!nextProfile.showSpeakerAudio) {
      form.setValue('speakerBg', '', { shouldDirty: true })
      form.setValue('audioDuration', '', { shouldDirty: true })
      form.setValue('audioMediaId', '', { shouldDirty: true })
      setAudioUrl('')
    }
    if (!nextProfile.showVideoSource) {
      form.setValue('videoUrl', '', { shouldDirty: true })
      form.setValue('videoMediaId', '', { shouldDirty: true })
    }
    if (nextProfile.showTeaser) {
      const body = form.getValues('body')
      const ensured = ensureTeaserParagraph(body)
      if (ensured !== body) {
        replace(ensured)
      }
    }
  }

  const saveMutation = useMutation({
    mutationFn: async (values: ArticleFormValues) => {
      const minutes = Number(values.readTimeMinutes) || 1
      const sectionProfile = getSectionProfile(values.section)
      const durationSeconds =
        values.readTimeUnit === 'hours' ? minutes * 3600 : minutes * 60
      const payload = {
        section: values.section,
        status: values.status,
        categoryBg: values.categoryBg,
        titleBg: values.titleBg,
        subtitleBg: values.subtitleBg,
        readTimeBg: formatReadTimeBg(minutes, values.readTimeUnit),
        locationBg: values.locationBg,
        dateBg: formatDateBg(values.dateIso),
        publishedAt: values.dateIso
          ? new Date(`${values.dateIso}T12:00:00`).toISOString()
          : undefined,
        photoCreditBg: values.photoCreditBg,
        endLabelBg: values.endLabelBg,
        speakerBg: values.speakerBg || undefined,
        audioDuration: sectionProfile.showVideoSource
          ? formatWatchDuration(durationSeconds) || undefined
          : values.audioDuration || undefined,
        authorId: values.authorId || undefined,
        galleryMediaIds: values.galleryMediaIds,
        heroMediaId: values.galleryMediaIds[0] || undefined,
        audioMediaId: values.audioMediaId || undefined,
        videoUrl: values.videoUrl.trim().startsWith('blob:')
          ? null
          : values.videoUrl.trim() || null,
        videoMediaId: values.videoMediaId || null,
        featured: values.featured,
        sponsored: values.sponsored,
        sponsorName: values.sponsored
          ? values.sponsorName.trim() || null
          : null,
        body: values.body,
        seriesId:
          values.seriesMode === 'series' && values.seriesId
            ? values.seriesId
            : null,
      }
      if (isNew) return createCmsArticle(payload)
      return updateCmsArticle(id!, payload)
    },
    onSuccess: async (article) => {
      await queryClient.invalidateQueries({ queryKey: ['cms-articles'] })
      await queryClient.invalidateQueries({ queryKey: ['cms-articles-count'] })
      await queryClient.invalidateQueries({ queryKey: ['cms-series'] })
      if (article.series?.id) {
        await queryClient.invalidateQueries({
          queryKey: ['cms-series-item', article.series.id],
        })
      }
      if (isNew) navigate(`${basePath}/${article.id}`, { replace: true })
      else await queryClient.invalidateQueries({ queryKey: ['cms-article', id] })
    },
  })

  const createAuthorMutation = useMutation({
    mutationFn: (nameBg: string) => createCmsAuthor(nameBg),
    onSuccess: async (author) => {
      await queryClient.invalidateQueries({ queryKey: ['cms-authors'] })
      form.setValue('authorId', author.id, { shouldDirty: true })
      setNewAuthorName('')
      setShowAuthorForm(false)
    },
  })

  const createSeriesMutation = useMutation({
    mutationFn: (titleBg: string) => createCmsSeries({ titleBg }),
    onSuccess: async (series) => {
      await queryClient.invalidateQueries({ queryKey: ['cms-series'] })
      form.setValue('seriesMode', 'series', { shouldDirty: true })
      form.setValue('seriesId', series.id, { shouldDirty: true })
      setNewSeriesTitle('')
      setShowCreateSeries(false)
    },
  })

  const uploadImages = async (files: FileList | null) => {
    if (!files?.length) return
    const list = Array.from(files)
    const temps: GalleryItem[] = list.map((file) => ({
      id: `temp-${crypto.randomUUID()}`,
      url: URL.createObjectURL(file),
      uploading: true,
    }))
    // Show local previews immediately — do not wait for MinIO.
    const startIndex = gallery.length
    setGallery((prev) => [...prev, ...temps])
    setActiveSlide(startIndex)

    const credit = form.getValues('photoCreditBg')
    void Promise.all(
      list.map(async (file, index) => {
        const tempId = temps[index].id
        try {
          const media = await uploadCmsMedia(file, credit)
          if (!form.getValues('photoCreditBg') && media.creditBg) {
            form.setValue('photoCreditBg', media.creditBg)
          }
          // Keep blob URL for snappy preview; only swap the id once uploaded.
          setGallery((prev) =>
            prev.map((item) =>
              item.id === tempId
                ? { id: media.id, url: item.url, uploading: false }
                : item,
            ),
          )
        } catch {
          setGallery((prev) => {
            const doomed = prev.find((item) => item.id === tempId)
            if (doomed?.url.startsWith('blob:')) URL.revokeObjectURL(doomed.url)
            return prev.filter((item) => item.id !== tempId)
          })
        }
      }),
    )
  }

  const uploadPoster = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    const tempId = `temp-${crypto.randomUUID()}`
    const tempUrl = URL.createObjectURL(file)
    setGallery([{ id: tempId, url: tempUrl, uploading: true }])
    try {
      const media = await uploadCmsMedia(file, form.getValues('photoCreditBg'))
      if (!form.getValues('photoCreditBg') && media.creditBg) {
        form.setValue('photoCreditBg', media.creditBg)
      }
      setGallery([{ id: media.id, url: tempUrl, uploading: false }])
    } catch {
      URL.revokeObjectURL(tempUrl)
      setGallery([])
    }
  }

  const setPosterFromBlob = async (blob: Blob, filename = 'poster.jpg') => {
    const file = new File([blob], filename, {
      type: blob.type || 'image/jpeg',
    })
    const tempId = `temp-${crypto.randomUUID()}`
    const tempUrl = URL.createObjectURL(file)
    setGallery([{ id: tempId, url: tempUrl, uploading: true }])
    try {
      const media = await uploadCmsMedia(file, form.getValues('photoCreditBg'))
      if (!form.getValues('photoCreditBg') && media.creditBg) {
        form.setValue('photoCreditBg', media.creditBg)
      }
      setGallery([{ id: media.id, url: tempUrl, uploading: false }])
    } catch {
      URL.revokeObjectURL(tempUrl)
    }
  }

  const uploadVideoFile = async (file: File) => {
    const localUrl = URL.createObjectURL(file)
    // Instant local playback while MinIO upload runs in the background.
    form.setValue('videoUrl', localUrl, { shouldDirty: true })
    form.setValue('videoMediaId', '', { shouldDirty: true })
    setVideoUploading(true)
    setPosterBusy(true)
    setLinkPreviewOpen(false)

    try {
      const uploadPromise = uploadCmsMedia(file)

      let posterBlob: Blob | null = null
      try {
        const captured = await captureVideoPosterBlob(file)
        posterBlob = captured.blob
        if (captured.durationSec > 0) {
          const mins = Math.max(1, Math.round(captured.durationSec / 60))
          form.setValue('readTimeMinutes', mins, { shouldDirty: true })
          form.setValue('readTimeUnit', 'minutes', { shouldDirty: true })
          form.setValue(
            'audioDuration',
            formatWatchDuration(captured.durationSec),
            { shouldDirty: true },
          )
        }
      } catch {
        /* keep video without auto poster */
      }

      if (posterBlob) {
        void setPosterFromBlob(posterBlob)
      }
      setPosterBusy(false)

      const media = await uploadPromise
      form.setValue('videoMediaId', media.id, { shouldDirty: true })
      // Keep local blob as preview URL so playback stays instant.
      form.setValue('videoUrl', localUrl, { shouldDirty: true })
    } catch {
      form.setValue('videoUrl', '', { shouldDirty: true })
      form.setValue('videoMediaId', '', { shouldDirty: true })
      URL.revokeObjectURL(localUrl)
    } finally {
      setVideoUploading(false)
      setPosterBusy(false)
    }
  }

  const previewExternalLink = async () => {
    const url = form.getValues('videoUrl').trim()
    const thumb = getRemotePosterUrl(url)
    if (!thumb) return
    setLinkPreviewOpen(true)
    setPosterBusy(true)
    try {
      const res = await fetch(thumb)
      if (!res.ok) throw new Error('Thumbnail fetch failed')
      const blob = await res.blob()
      await setPosterFromBlob(blob)
    } catch {
      /* Preview still shows remote thumbnail without gallery save */
    } finally {
      setPosterBusy(false)
    }
  }

  const uploadAudioFile = async (file: File) => {
    const localUrl = URL.createObjectURL(file)
    setAudioUrl(localUrl)
    setAudioUploading(true)
    form.setValue('audioMediaId', '', { shouldDirty: true })

    // Read duration from local file immediately
    void new Promise<void>((resolve) => {
      const el = document.createElement('audio')
      el.preload = 'metadata'
      el.onloadedmetadata = () => {
        if (Number.isFinite(el.duration) && el.duration > 0) {
          form.setValue('audioDuration', formatWatchDuration(el.duration), {
            shouldDirty: true,
          })
        }
        resolve()
      }
      el.onerror = () => resolve()
      el.src = localUrl
    })

    try {
      const media = await uploadCmsMedia(file)
      form.setValue('audioMediaId', media.id, { shouldDirty: true })
      // Keep local blob for instant playback in the editor.
    } catch {
      setAudioUrl('')
      form.setValue('audioMediaId', '', { shouldDirty: true })
      URL.revokeObjectURL(localUrl)
    } finally {
      setAudioUploading(false)
    }
  }

  const videoPlayback = resolveVideoPlayback(videoUrlValue)
  const hasVideoSource = Boolean(videoUrlValue.trim() || videoMediaIdValue)
  const isFileVideo =
    Boolean(videoMediaIdValue) ||
    videoUrlValue.startsWith('blob:') ||
    videoPlayback?.kind === 'file'
  const isEmbedVideo =
    videoPlayback?.kind === 'youtube' || videoPlayback?.kind === 'vimeo'
  const remoteThumb = getRemotePosterUrl(videoUrlValue)
  const posterPreviewUrl =
    gallery[0]?.url || (linkPreviewOpen && remoteThumb ? remoteThumb : '')

  useEffect(() => {
    setLinkPreviewOpen(false)
  }, [videoUrlValue])


  useEffect(() => {
    if (gallery.length === 0) {
      setActiveSlide(0)
      return
    }
    setActiveSlide((prev) => Math.min(prev, gallery.length - 1))
  }, [gallery.length])

  const removeImage = (mediaId: string) => {
    setGallery((prev) => {
      const next = prev.filter((item) => item.id !== mediaId)
      return next
    })
  }

  const setAsHero = (mediaId: string) => {
    setGallery((prev) => {
      const index = prev.findIndex((item) => item.id === mediaId)
      if (index <= 0) return prev
      const next = [...prev]
      const [item] = next.splice(index, 1)
      next.unshift(item)
      return next
    })
    setActiveSlide(0)
  }

  const goPrev = () => {
    setActiveSlide((prev) => (prev <= 0 ? gallery.length - 1 : prev - 1))
  }

  const goNext = () => {
    setActiveSlide((prev) => (prev >= gallery.length - 1 ? 0 : prev + 1))
  }

  const onSubmit = form.handleSubmit(async (values) => {
    // Wait briefly if an upload is still finishing so we don't save temp ids.
    if (
      gallery.some((item) => item.uploading) ||
      videoUploading ||
      audioUploading
    ) {
      return
    }
    await saveMutation.mutateAsync({
      ...values,
      galleryMediaIds: gallery
        .filter((item) => !item.uploading && !item.id.startsWith('temp-'))
        .map((item) => item.id),
    })
  })

  if (!isNew && articleQuery.isLoading) {
    return <p className="text-sm text-stone-500">{t('cms.editor.loading')}</p>
  }

  if (!isNew && articleQuery.isError) {
    return (
      <p className="text-sm text-rose-700">
        {(articleQuery.error as ApiError).message || t('cms.editor.loadFailed')}
      </p>
    )
  }

  const displayTitle = pickLang(
    lang,
    articleQuery.data?.title,
    form.watch('titleBg') || articleQuery.data?.titleBg,
  )

  const sectionOptions = ARTICLE_SECTIONS.map((item) => ({
    value: item,
    label: t(`cms.sections.${item}`),
  }))

  const statusOptions = (
    ['DRAFT', 'REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'] as const
  ).map((status) => ({
    value: status,
    label: t(`cms.status.${status.toLowerCase()}`),
  }))

  const authorOptions = (authorsQuery.data ?? []).map((author) => ({
    value: author.id,
    label: pickLang(lang, author.nameEn ?? author.nameBg, author.nameBg),
  }))

  const mediaBusy =
    gallery.some((item) => item.uploading) || videoUploading || audioUploading

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E4DC] pb-4">
        <Link
          to={basePath}
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 transition-colors hover:text-[#0C2686]"
        >
          <ArrowLeft className="size-4" />
          {t('cms.editor.back')}
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={form.watch('status')} />
          {articleQuery.data?.translationStatus && (
            <StatusPill status={articleQuery.data.translationStatus} />
          )}
          <GhostButton
            type="button"
            onClick={() => {
              form.setValue('status', 'DRAFT')
              void onSubmit()
            }}
            disabled={saveMutation.isPending || mediaBusy}
          >
            <Save className="size-4" /> {t('cms.editor.saveDraft')}
          </GhostButton>
          <PrimaryButton
            type="button"
            onClick={() => {
              form.setValue('status', 'PUBLISHED')
              void onSubmit()
            }}
            disabled={saveMutation.isPending || mediaBusy}
          >
            {t('cms.editor.publish')}
          </PrimaryButton>
        </div>
      </div>

      <CmsPageHeader
        title={
          isNew
            ? t('cms.editor.newStory')
            : t('cms.editor.editing', {
                title: displayTitle || t('cms.editor.untitled'),
              })
        }
        description={t('cms.editor.chooseSectionFirst')}
      />

      <form
        onSubmit={onSubmit}
        className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_320px]"
      >
        <div className="space-y-6">
          <CmsCard className="space-y-3 p-5">
            <h2 className="text-sm font-semibold text-stone-800">
              {t('cms.editor.sectionHint')}
            </h2>
            <JournalSelect
              name="section"
              label={t('cms.editor.section')}
              placeholder={t('cms.editor.section')}
              options={sectionOptions}
              value={section}
              onChange={(value) => applySection(value as ArticleSection)}
            />
            <p className="text-xs text-stone-500">
              {t('cms.editor.description')}
            </p>
          </CmsCard>

          {profile.showVideoSource ? (
            <CmsCard className="space-y-5 p-6">
              <div>
                <h2 className="font-heading text-lg font-semibold">
                  {t('cms.editor.videoMedia')}
                </h2>
                <p className="mt-1 text-xs text-stone-500">
                  {t('cms.editor.videoSourceHint')}
                </p>
              </div>

              <div className="space-y-2">
                <label className="block space-y-1.5 text-xs font-medium text-stone-600">
                  <span>{t('cms.editor.videoUrl')}</span>
                  <input
                    className="w-full rounded-lg border border-[#E8E4DC] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0C2686]"
                    placeholder="https://www.youtube.com/watch?v=…"
                    {...form.register('videoUrl', {
                      onChange: () => {
                        if (form.getValues('videoUrl').trim()) {
                          form.setValue('videoMediaId', '', {
                            shouldDirty: true,
                          })
                        }
                      },
                    })}
                  />
                </label>
                {isEmbedVideo && videoUrlValue.trim() && !videoMediaIdValue ? (
                  <GhostButton
                    type="button"
                    className="py-2 text-xs"
                    disabled={posterBusy}
                    onClick={() => {
                      void previewExternalLink()
                    }}
                  >
                    <Eye className="size-3.5" />
                    {posterBusy
                      ? t('cms.editor.generatingPoster')
                      : t('cms.editor.videoPreview')}
                  </GhostButton>
                ) : null}
              </div>

              <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-stone-400">
                <span className="h-px flex-1 bg-[#E8E4DC]" />
                {t('cms.editor.or')}
                <span className="h-px flex-1 bg-[#E8E4DC]" />
              </div>

              {!hasVideoSource ? (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#E8E4DC] bg-[#FAF8F3] px-6 py-16 text-center transition-colors hover:border-[#0C2686]/40">
                  <Film className="size-8 text-[#0C2686]" />
                  <span className="text-sm font-medium text-stone-600">
                    {videoUploading || posterBusy
                      ? t('cms.authors.uploading')
                      : t('cms.editor.addVideo')}
                  </span>
                  <span className="text-[11px] text-stone-400">
                    {t('cms.editor.uploadVideo')}
                  </span>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    disabled={videoUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      await uploadVideoFile(file)
                      e.target.value = ''
                    }}
                  />
                </label>
              ) : (
                <div className="space-y-3">
                  {isFileVideo && videoUrlValue ? (
                    <div className="overflow-hidden rounded-2xl border border-[#E8E4DC] bg-black">
                      <video
                        key={videoUrlValue}
                        src={videoUrlValue}
                        controls
                        playsInline
                        preload="metadata"
                        poster={gallery[0]?.url || undefined}
                        className="aspect-video w-full bg-black object-contain"
                        onLoadedMetadata={(e) => {
                          const durationSec = e.currentTarget.duration
                          if (!Number.isFinite(durationSec) || durationSec < 1)
                            return
                          const mins = Math.max(1, Math.round(durationSec / 60))
                          form.setValue('readTimeMinutes', mins, {
                            shouldDirty: true,
                          })
                          form.setValue('readTimeUnit', 'minutes', {
                            shouldDirty: true,
                          })
                          form.setValue(
                            'audioDuration',
                            formatWatchDuration(durationSec),
                            { shouldDirty: true },
                          )
                        }}
                      />
                    </div>
                  ) : null}

                  {isEmbedVideo &&
                  (linkPreviewOpen || gallery[0]) &&
                  (posterPreviewUrl || remoteThumb) ? (
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
                        {gallery[0]
                          ? t('cms.editor.posterFromLink')
                          : t('cms.editor.videoPreviewHint')}
                      </p>
                      <div className="relative aspect-video overflow-hidden rounded-2xl border border-[#E8E4DC] bg-stone-100">
                        <img
                          src={posterPreviewUrl || remoteThumb || ''}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#E8E4DC] bg-white px-3 py-2 text-xs font-semibold text-[#0C2686]">
                      <Film className="size-3.5" />
                      {videoUploading
                        ? t('cms.authors.uploading')
                        : t('cms.editor.replaceVideo')}
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        disabled={videoUploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          await uploadVideoFile(file)
                          e.target.value = ''
                        }}
                      />
                    </label>
                    <GhostButton
                      type="button"
                      className="py-2 text-xs"
                      onClick={() => {
                        form.setValue('videoUrl', '', { shouldDirty: true })
                        form.setValue('videoMediaId', '', { shouldDirty: true })
                        setLinkPreviewOpen(false)
                      }}
                    >
                      {t('cms.editor.clearVideo')}
                    </GhostButton>
                  </div>
                </div>
              )}

              <div className="border-t border-[#E8E4DC] pt-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-stone-800">
                      {t('cms.editor.videoPoster')}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-stone-500">
                      {posterBusy
                        ? t('cms.editor.generatingPoster')
                        : gallery[0]
                          ? t('cms.editor.posterAutoReady')
                          : t('cms.editor.videoPosterHint')}
                    </p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#E8E4DC] bg-white px-3 py-2 text-xs font-semibold text-[#0C2686]">
                    <ImagePlus className="size-3.5" />
                    {t('cms.editor.uploadPoster')}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        void uploadPoster(e.target.files)
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>
                {gallery[0] ? (
                  <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-[#E8E4DC] bg-stone-100">
                    <img
                      src={gallery[0].url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(gallery[0].id)}
                      className="absolute right-3 top-3 rounded-lg bg-white/95 p-1.5 text-stone-600 shadow-sm"
                      title={t('cms.editor.removeImage')}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : linkPreviewOpen && remoteThumb ? (
                  <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-[#E8E4DC] bg-stone-100">
                    <img
                      src={remoteThumb}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#E8E4DC] bg-white px-6 py-8 text-center text-xs text-stone-400">
                    {posterBusy
                      ? t('cms.editor.generatingPoster')
                      : t('cms.editor.videoPosterHint')}
                  </div>
                )}
              </div>
            </CmsCard>
          ) : profile.showSpeakerAudio ? (
            <CmsCard className="space-y-5 p-6">
              <div>
                <h2 className="font-heading text-lg font-semibold">
                  {t('cms.editor.audioMedia')}
                </h2>
                <p className="mt-1 text-xs text-stone-500">
                  {t('cms.editor.audioSourceHint')}
                </p>
              </div>

              {!audioUrl && !form.watch('audioMediaId') ? (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#E8E4DC] bg-[#FAF8F3] px-6 py-16 text-center transition-colors hover:border-[#0C2686]/40">
                  <Headphones className="size-8 text-[#0C2686]" />
                  <span className="text-sm font-medium text-stone-600">
                    {audioUploading
                      ? t('cms.authors.uploading')
                      : t('cms.editor.addAudio')}
                  </span>
                  <span className="text-[11px] text-stone-400">
                    {t('cms.editor.uploadAudio')}
                  </span>
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    disabled={audioUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      await uploadAudioFile(file)
                      e.target.value = ''
                    }}
                  />
                </label>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#E8E4DC] bg-[#FAF8F3] p-4">
                    <p className="mb-3 text-xs font-semibold text-stone-700">
                      {t('cms.editor.audioReady')}
                    </p>
                    {audioUrl ? (
                      <audio
                        key={audioUrl}
                        src={audioUrl}
                        controls
                        preload="metadata"
                        className="w-full"
                        onLoadedMetadata={(e) => {
                          const durationSec = e.currentTarget.duration
                          if (!Number.isFinite(durationSec) || durationSec < 1)
                            return
                          if (!form.getValues('audioDuration')) {
                            form.setValue(
                              'audioDuration',
                              formatWatchDuration(durationSec),
                              { shouldDirty: true },
                            )
                          }
                        }}
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#E8E4DC] bg-white px-3 py-2 text-xs font-semibold text-[#0C2686]">
                      <Headphones className="size-3.5" />
                      {audioUploading
                        ? t('cms.authors.uploading')
                        : t('cms.editor.replaceAudio')}
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        disabled={audioUploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          await uploadAudioFile(file)
                          e.target.value = ''
                        }}
                      />
                    </label>
                    <GhostButton
                      type="button"
                      className="py-2 text-xs"
                      onClick={() => {
                        form.setValue('audioMediaId', '', { shouldDirty: true })
                        form.setValue('audioDuration', '', { shouldDirty: true })
                        setAudioUrl('')
                      }}
                    >
                      {t('cms.editor.clearAudio')}
                    </GhostButton>
                  </div>
                </div>
              )}

              <div className="border-t border-[#E8E4DC] pt-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-stone-800">
                      {t('cms.editor.audioCover')}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-stone-500">
                      {t('cms.editor.audioCoverHint')}
                    </p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#E8E4DC] bg-white px-3 py-2 text-xs font-semibold text-[#0C2686]">
                    <ImagePlus className="size-3.5" />
                    {gallery[0]
                      ? t('cms.editor.audioCoverChange')
                      : t('cms.editor.audioCoverUpload')}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        void uploadPoster(e.target.files)
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>
                {gallery[0] ? (
                  <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-[#E8E4DC] bg-stone-100">
                    <img
                      src={gallery[0].url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(gallery[0].id)}
                      className="absolute right-3 top-3 rounded-lg bg-white/95 p-1.5 text-stone-600 shadow-sm"
                      title={t('cms.editor.removeImage')}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E8E4DC] bg-white px-6 py-10 text-center transition-colors hover:border-[#0C2686]/40">
                    <ImagePlus className="size-6 text-stone-400" />
                    <span className="text-xs font-medium text-stone-500">
                      {t('cms.editor.audioCoverUpload')}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        void uploadPoster(e.target.files)
                        e.target.value = ''
                      }}
                    />
                  </label>
                )}
              </div>
            </CmsCard>
          ) : (
          <CmsCard className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-heading text-lg font-semibold">
                {t('cms.editor.gallery')}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                {gallery.length > 0 && (
                  <GhostButton
                    type="button"
                    onClick={() =>
                      setGalleryView((v) => (v === 'slider' ? 'grid' : 'slider'))
                    }
                  >
                    <LayoutGrid className="size-3.5" />
                    {galleryView === 'slider'
                      ? t('cms.editor.showAll')
                      : t('cms.editor.showSlider')}
                  </GhostButton>
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#E8E4DC] bg-white px-4 py-2.5 text-xs font-semibold text-[#0C2686] shadow-2xs">
                  <ImagePlus className="size-4" />
                  {t('cms.editor.addImages')}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      void uploadImages(e.target.files)
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>
            </div>

            {gallery.length === 0 ? (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#E8E4DC] bg-[#FAF8F3] px-6 py-16 text-center transition-colors hover:border-[#0C2686]/40">
                <ImagePlus className="size-8 text-[#0C2686]" />
                <span className="text-sm font-medium text-stone-600">
                  {t('cms.editor.addImages')}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    void uploadImages(e.target.files)
                    e.target.value = ''
                  }}
                />
              </label>
            ) : galleryView === 'slider' ? (
              <div className="space-y-3">
                <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-[#E8E4DC] bg-stone-100">
                  <img
                    src={gallery[activeSlide]?.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  {activeSlide === 0 && (
                    <span className="absolute left-3 top-3 rounded-md bg-[#0C2686] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                      {t('cms.editor.heroLabel')}
                    </span>
                  )}
                  <div className="absolute right-3 top-3 flex gap-2">
                    {activeSlide !== 0 && (
                      <button
                        type="button"
                        onClick={() => setAsHero(gallery[activeSlide].id)}
                        className="rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-[#0C2686] shadow-sm"
                      >
                        {t('cms.editor.setAsHero')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(gallery[activeSlide].id)}
                      className="rounded-lg bg-white/95 p-1.5 text-stone-600 shadow-sm"
                      title={t('cms.editor.removeImage')}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>

                  {gallery.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={goPrev}
                        className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#E8E4DC] bg-white/95 text-stone-700 shadow-md transition hover:text-[#0C2686]"
                        aria-label={t('cms.stories.prev')}
                      >
                        <ChevronLeft className="size-5" />
                      </button>
                      <button
                        type="button"
                        onClick={goNext}
                        className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#E8E4DC] bg-white/95 text-stone-700 shadow-md transition hover:text-[#0C2686]"
                        aria-label={t('cms.stories.next')}
                      >
                        <ChevronRight className="size-5" />
                      </button>
                    </>
                  )}

                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold text-white">
                    {t('cms.editor.imageOf', {
                      current: activeSlide + 1,
                      total: gallery.length,
                    })}
                  </div>
                </div>

                {gallery.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {gallery.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveSlide(index)}
                        className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                          index === activeSlide
                            ? 'border-[#0C2686]'
                            : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={item.url}
                          alt=""
                          className={cn(
                            'h-full w-full object-cover',
                            item.uploading && 'opacity-60',
                          )}
                        />
                        {item.uploading && (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-[9px] font-semibold uppercase tracking-wider text-white">
                            …
                          </span>
                        )}
                        {index === 0 && !item.uploading && (
                          <span className="absolute inset-x-0 bottom-0 bg-[#0C2686]/90 py-0.5 text-center text-[9px] font-semibold uppercase text-white">
                            {t('cms.editor.heroLabel')}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {gallery.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveSlide(index)
                      setGalleryView('slider')
                    }}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-[#E8E4DC] bg-stone-100 text-left"
                  >
                    <img
                      src={item.url}
                      alt=""
                      className={cn(
                        'h-full w-full object-cover transition group-hover:scale-105',
                        item.uploading && 'opacity-60',
                      )}
                    />
                    {item.uploading && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-[10px] font-semibold uppercase tracking-wider text-white">
                        …
                      </span>
                    )}
                    {index === 0 && !item.uploading && (
                      <span className="absolute left-2 top-2 rounded-md bg-[#0C2686] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                        {t('cms.editor.heroLabel')}
                      </span>
                    )}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        removeImage(item.id)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation()
                          removeImage(item.id)
                        }
                      }}
                      className="absolute right-2 top-2 rounded-lg bg-white/95 p-1.5 text-stone-600 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                      title={t('cms.editor.removeImage')}
                    >
                      <X className="size-3.5" />
                    </span>
                    {index !== 0 && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation()
                          setAsHero(item.id)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation()
                            setAsHero(item.id)
                          }
                        }}
                        className="absolute inset-x-2 bottom-2 rounded-md bg-white/95 px-2 py-1 text-center text-[10px] font-semibold text-[#0C2686] opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                      >
                        {t('cms.editor.setAsHero')}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </CmsCard>
          )}

          <CmsCard className="space-y-4 p-6 md:p-8">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                {seriesMode === 'series'
                  ? t('cms.series.episodeTitle')
                  : t(`cms.editor.${profile.titleKey}`)}
              </span>
              <input
                className="w-full border border-[#E8E4DC] bg-[#FAF8F3] px-3 py-3 font-heading text-2xl outline-none focus:border-[#0C2686]"
                {...form.register('titleBg')}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                {t(`cms.editor.${profile.subtitleKey}`)}
              </span>
              <textarea
                rows={2}
                className="w-full border border-[#E8E4DC] bg-[#FAF8F3] px-3 py-2 text-sm outline-none focus:border-[#0C2686]"
                {...form.register('subtitleBg')}
              />
            </label>
            {profile.showTeaser && profile.teaserKey && (
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  {t(`cms.editor.${profile.teaserKey}`)}
                </span>
                <textarea
                  rows={3}
                  className="w-full border border-[#E8E4DC] bg-[#FAF8F3] px-3 py-2 text-sm outline-none focus:border-[#0C2686]"
                  value={
                    form.watch('body.0.type') === 'paragraph'
                      ? form.watch('body.0.textBg')
                      : ''
                  }
                  onChange={(e) => {
                    if (form.getValues('body.0.type') !== 'paragraph') {
                      replace(
                        ensureTeaserParagraph(form.getValues('body')).map(
                          (block, i) =>
                            i === 0
                              ? {
                                  type: 'paragraph' as const,
                                  textBg: e.target.value,
                                }
                              : block,
                        ),
                      )
                      return
                    }
                    form.setValue('body.0.textBg', e.target.value, {
                      shouldDirty: true,
                    })
                  }}
                />
                <span className="block text-[11px] text-stone-500">
                  {t('cms.editor.teaserHint')}
                </span>
              </label>
            )}
          </CmsCard>

          <CmsCard className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold">
                {t('cms.editor.bodyBlocks')}
              </h2>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['paragraph', 'cms.editor.paragraph'],
                    ['pullquote', 'cms.editor.pullquote'],
                    ['note', 'cms.editor.note'],
                    ['caption', 'cms.editor.caption'],
                  ] as const
                ).map(([type, labelKey]) => (
                  <GhostButton
                    key={type}
                    type="button"
                    onClick={() => {
                      const block: BodyBlock =
                        type === 'pullquote'
                          ? { type, textBg: '', citeBg: '' }
                          : type === 'note'
                            ? { type, labelBg: 'Бележка', textBg: '' }
                            : { type, textBg: '' }
                      append(block)
                    }}
                  >
                    <Plus className="size-3.5" /> {t(labelKey)}
                  </GhostButton>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => {
                const type = form.watch(`body.${index}.type`)
                const isTeaserParagraph =
                  profile.showTeaser &&
                  index === 0 &&
                  type === 'paragraph'
                if (isTeaserParagraph) return null

                return (
                  <div
                    key={field.id}
                    className="space-y-2 border border-[#E8E4DC] bg-[#FAF8F3] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#0C2686]">
                        {t(`cms.editor.${type}`)}
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-stone-500 hover:text-rose-700"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    {type === 'note' && (
                      <input
                        placeholder={t('cms.editor.labelBg')}
                        className="w-full border border-[#E8E4DC] bg-white px-3 py-2 text-sm outline-none"
                        {...form.register(`body.${index}.labelBg`)}
                      />
                    )}
                    <textarea
                      rows={type === 'paragraph' ? 5 : 3}
                      placeholder={t('cms.editor.textBg')}
                      className="w-full border border-[#E8E4DC] bg-white px-3 py-2 text-sm outline-none"
                      {...form.register(`body.${index}.textBg`)}
                    />
                    {type === 'pullquote' && (
                      <input
                        placeholder={t('cms.editor.citeBg')}
                        className="w-full border border-[#E8E4DC] bg-white px-3 py-2 text-sm outline-none"
                        {...form.register(`body.${index}.citeBg`)}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </CmsCard>
        </div>

        <div className="space-y-6">
          <CmsCard className="space-y-4 p-5">
            <h3 className="text-sm font-semibold">{t('cms.series.seriesMode')}</h3>
            <div className="space-y-2 text-xs">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="seriesMode"
                  checked={seriesMode === 'standalone'}
                  onChange={() => {
                    form.setValue('seriesMode', 'standalone', {
                      shouldDirty: true,
                    })
                    form.setValue('seriesId', '', { shouldDirty: true })
                  }}
                />
                {t('cms.series.standalone')}
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="seriesMode"
                  checked={seriesMode === 'series'}
                  onChange={() =>
                    form.setValue('seriesMode', 'series', { shouldDirty: true })
                  }
                />
                {t('cms.series.partOfSeries')}
              </label>
            </div>

            {seriesMode === 'series' && (
              <div className="space-y-3 border-t border-[#E8E4DC] pt-3">
                <div className="space-y-1 text-xs">
                  <span>{t('cms.series.selectSeries')}</span>
                  <JournalSelect
                    name="seriesId"
                    label={t('cms.series.selectSeries')}
                    placeholder={t('cms.series.selectSeries')}
                    options={(seriesListQuery.data ?? []).map((item) => ({
                      value: item.id,
                      label: pickLang(lang, item.titleEn, item.titleBg),
                    }))}
                    value={seriesId}
                    onChange={(value) =>
                      form.setValue('seriesId', value, { shouldDirty: true })
                    }
                  />
                </div>

                {!isNew &&
                  articleQuery.data?.series?.id === seriesId &&
                  articleQuery.data.series.episodeNumber != null && (
                    <p className="text-xs text-stone-500">
                      {t('cms.series.currentEpisode', {
                        n: articleQuery.data.series.episodeNumber,
                      })}
                    </p>
                  )}

                {!showCreateSeries ? (
                  <GhostButton
                    type="button"
                    className="w-full py-2 text-xs"
                    onClick={() => setShowCreateSeries(true)}
                  >
                    <Plus className="size-3.5" />
                    {t('cms.series.createNewSeries')}
                  </GhostButton>
                ) : (
                  <div className="space-y-2">
                    <input
                      className="w-full rounded-lg border border-[#E8E4DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#0C2686]"
                      placeholder={t('cms.series.createSeriesPlaceholder')}
                      value={newSeriesTitle}
                      onChange={(e) => setNewSeriesTitle(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <PrimaryButton
                        type="button"
                        className="flex-1 py-2 text-xs"
                        disabled={
                          !newSeriesTitle.trim() ||
                          createSeriesMutation.isPending
                        }
                        onClick={() =>
                          createSeriesMutation.mutate(newSeriesTitle.trim())
                        }
                      >
                        {t('cms.series.createSeriesSubmit')}
                      </PrimaryButton>
                      <GhostButton
                        type="button"
                        className="py-2 text-xs"
                        onClick={() => {
                          setShowCreateSeries(false)
                          setNewSeriesTitle('')
                        }}
                      >
                        <X className="size-4" />
                      </GhostButton>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CmsCard>

          <CmsCard className="space-y-4 p-5">
            <h3 className="text-sm font-semibold">{t('cms.editor.publishing')}</h3>
            <div className="space-y-1 text-xs">
              <span>{t('cms.editor.status')}</span>
              <JournalSelect
                name="status"
                label={t('cms.editor.status')}
                placeholder={t('cms.editor.status')}
                options={statusOptions}
                value={form.watch('status')}
                onChange={(value) =>
                  form.setValue('status', value as ArticleFormValues['status'], {
                    shouldDirty: true,
                  })
                }
              />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" {...form.register('featured')} />{' '}
              {t('cms.editor.featured')}
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" {...form.register('sponsored')} />{' '}
              {t('cms.editor.sponsored')}
            </label>
            {form.watch('sponsored') ? (
              <label className="block space-y-1 text-xs">
                {t('cms.editor.sponsorName')}
                <input
                  className="w-full border border-[#E8E4DC] bg-white px-2 py-2"
                  placeholder={t('cms.editor.sponsorNamePlaceholder')}
                  {...form.register('sponsorName')}
                />
              </label>
            ) : null}
          </CmsCard>

          <CmsCard className="space-y-3 p-5">
            <h3 className="text-sm font-semibold">{t('cms.editor.headlineMeta')}</h3>
            <label className="block space-y-1 text-xs">
              {t('cms.editor.category')}
              <input
                className="w-full border border-[#E8E4DC] bg-white px-2 py-2"
                {...form.register('categoryBg')}
              />
            </label>
            {profile.showReadTime && (
            <label className="block space-y-1 text-xs">
              {profile.showVideoSource
                ? t('cms.editor.audioDuration')
                : t('cms.editor.readTime')}
              <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-end gap-2">
                <input
                  type="number"
                  min={1}
                  max={180}
                  className="w-full border border-[#E8E4DC] bg-white px-2 py-2"
                  {...form.register('readTimeMinutes')}
                />
                {profile.showVideoSource ? (
                  <div className="flex h-[42px] items-center rounded-md border border-[#E8E4DC] bg-[#FAF8F3] px-3 text-sm text-stone-600">
                    {t('cms.editor.minutes')}
                  </div>
                ) : (
                  <JournalSelect
                    name="readTimeUnit"
                    label={t('cms.editor.readTime')}
                    placeholder={t('cms.editor.minutes')}
                    options={[
                      { value: 'minutes', label: t('cms.editor.minutes') },
                      { value: 'hours', label: t('cms.editor.hours') },
                    ]}
                    value={form.watch('readTimeUnit')}
                    onChange={(value) =>
                      form.setValue(
                        'readTimeUnit',
                        value as 'minutes' | 'hours',
                        { shouldDirty: true },
                      )
                    }
                  />
                )}
              </div>
              <span className="mt-1 block text-[11px] text-stone-500">
                {formatReadTimeBg(
                  Number(form.watch('readTimeMinutes')) || 1,
                  profile.showVideoSource
                    ? 'minutes'
                    : form.watch('readTimeUnit'),
                )}
              </span>
            </label>
            )}
            <label className="block space-y-1 text-xs">
              {t('cms.editor.date')}
              <input
                type="date"
                lang="bg-BG"
                className="w-full border border-[#E8E4DC] bg-white px-2 py-2"
                {...form.register('dateIso')}
              />
              {form.watch('dateIso') && (
                <span className="mt-1 block text-[11px] text-stone-500">
                  {formatDateBg(form.watch('dateIso'))}
                </span>
              )}
            </label>
            {profile.showLocation && (
            <label className="block space-y-1 text-xs">
              {t('cms.editor.location')}
              <input
                className="w-full border border-[#E8E4DC] bg-white px-2 py-2"
                {...form.register('locationBg')}
              />
            </label>
            )}
            <label className="block space-y-1 text-xs">
              {t('cms.editor.photoCredit')}
              <input
                className="w-full border border-[#E8E4DC] bg-white px-2 py-2"
                {...form.register('photoCreditBg')}
              />
            </label>
            <label className="block space-y-1 text-xs">
              {t('cms.editor.endLabel')}
              <input
                className="w-full border border-[#E8E4DC] bg-white px-2 py-2"
                {...form.register('endLabelBg')}
              />
            </label>
            {profile.showSpeakerAudio && (
              <>
                <label className="block space-y-1 text-xs">
                  {t('cms.editor.speaker')}
                  <input
                    className="w-full border border-[#E8E4DC] bg-white px-2 py-2"
                    {...form.register('speakerBg')}
                  />
                </label>
                <label className="block space-y-1 text-xs">
                  {t('cms.editor.audioDuration')}
                  <input
                    className="w-full border border-[#E8E4DC] bg-white px-2 py-2"
                    {...form.register('audioDuration')}
                  />
                </label>
              </>
            )}
          </CmsCard>

          {profile.showAuthor && (
          <CmsCard className="space-y-3 p-5">
            <h3 className="text-sm font-semibold">{t('cms.editor.author')}</h3>
            <JournalSelect
              name="authorId"
              label={t('cms.editor.author')}
              placeholder={t('cms.editor.selectAuthor')}
              options={authorOptions}
              value={form.watch('authorId')}
              onChange={(value) =>
                form.setValue('authorId', value, { shouldDirty: true })
              }
            />
            {!showAuthorForm ? (
              <GhostButton
                type="button"
                onClick={() => setShowAuthorForm(true)}
                className="w-full justify-center"
              >
                <Plus className="size-3.5" /> {t('cms.editor.addAuthor')}
              </GhostButton>
            ) : (
              <div className="space-y-2 rounded-xl border border-[#E8E4DC] bg-[#FAF8F3] p-3">
                <label className="block space-y-1 text-xs">
                  {t('cms.editor.authorName')}
                  <input
                    value={newAuthorName}
                    onChange={(e) => setNewAuthorName(e.target.value)}
                    className="w-full border border-[#E8E4DC] bg-white px-2 py-2"
                  />
                </label>
                <div className="flex gap-2">
                  <PrimaryButton
                    type="button"
                    disabled={
                      !newAuthorName.trim() || createAuthorMutation.isPending
                    }
                    onClick={() =>
                      createAuthorMutation.mutate(newAuthorName.trim())
                    }
                  >
                    {t('cms.editor.createAuthor')}
                  </PrimaryButton>
                  <GhostButton
                    type="button"
                    onClick={() => {
                      setShowAuthorForm(false)
                      setNewAuthorName('')
                    }}
                  >
                    {t('cms.editor.cancel')}
                  </GhostButton>
                </div>
                {createAuthorMutation.isError && (
                  <p className="text-xs text-rose-700">
                    {(createAuthorMutation.error as ApiError)?.message}
                  </p>
                )}
              </div>
            )}
          </CmsCard>
          )}

          {saveMutation.isError && (
            <p className="text-sm text-rose-700">
              {(saveMutation.error as ApiError)?.message ||
                t('cms.editor.saveFailed')}
            </p>
          )}
          {saveMutation.isSuccess && (
            <p className="text-sm text-emerald-700">
              {t('cms.editor.saved')}
              {(articleQuery.data?.translationStatus === 'PENDING' ||
                articleQuery.data?.translationStatus === 'RUNNING') &&
                t('cms.editor.translating')}
              {articleQuery.data?.translationStatus === 'READY' &&
                t('cms.editor.translationReady')}
              {articleQuery.data?.translationStatus === 'FAILED' &&
                `${t('cms.editor.translationFailed')}${articleQuery.data.translationError ? `: ${articleQuery.data.translationError}` : '.'}`}
            </p>
          )}
        </div>
      </form>
    </div>
  )
}
