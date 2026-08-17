import { useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes } from 'react'
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
  Clock,
  Eye,
  Film,
  Headphones,
  ImagePlus,
  LayoutGrid,
  Loader2,
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
import {
  CmsCheckbox,
  CmsField,
  CmsInput,
  CmsRadio,
  CmsRadioGroup,
  CmsTextarea,
} from '@/cms/components/CmsFields'
import { CmsTagPicker } from '@/cms/components/CmsMultiSelect'
import { AiAssistantPanel } from '@/cms/components/AiAssistantPanel'
import { NarrationPanel } from '@/cms/components/NarrationPanel'
import { JournalSelect } from '@/components/ui/JournalSelect'
import {
  createCmsArticle,
  createCmsAuthor,
  getCmsArticle,
  listCmsAuthors,
  queueArticleTranslation,
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
import { createCmsTag, listCmsTags } from '@/lib/tags-api'
import { ApiError } from '@/lib/api'
import { useJournalLang } from '@/hooks/useJournalLang'
import { pickLang } from '@/lib/pick-lang'
import { cn, randomId } from '@/lib/utils'
import { getSectionProfile } from '@/cms/section-profiles'
import {
  defaultScheduleLocal,
  editorActionDisabled,
  isScheduleDueNow,
  joinDatetimeLocal,
  publishedAtPayload,
  splitDatetimeLocal,
  toDatetimeLocalValue,
  type EditorSaveAction,
} from '@/cms/pages/story-editor-actions'
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
    citeBg: z.string(),
  }),
  z.object({
    type: z.literal('note'),
    labelBg: z.string().min(1),
    textBg: z.string(),
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
    'news',
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
  sourced: z.boolean(),
  sponsorName: z.string(),
  behindStoryBg: z.string(),
  seoTitleBg: z.string(),
  seoDescriptionBg: z.string(),
  tagIds: z.array(z.string()),
  body: z.array(blockSchema).min(1),
  seriesMode: z.enum(['standalone', 'series']),
  seriesId: z.string(),
  scheduledAt: z.string(),
}).superRefine((values, ctx) => {
  if (values.status !== 'SCHEDULED') return
  if (!values.scheduledAt.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['scheduledAt'],
      message: 'required',
    })
  }
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
  scheduledAt: '',
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
  sourced: false,
  sponsorName: '',
  behindStoryBg: '',
  seoTitleBg: '',
  seoDescriptionBg: '',
  tagIds: [],
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

type GalleryItem = {
  id: string
  url: string
  /** Local file waiting to upload on Save/Publish */
  file?: File
}

function revokeIfBlob(url?: string | null) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
}

function preloadImageUrl(url: string) {
  return new Promise<void>((resolve) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = url
  })
}

function EditorActionButton({
  primary,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { primary: boolean }) {
  const Button = primary ? PrimaryButton : GhostButton
  return <Button {...props} />
}

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
  const [posterBusy, setPosterBusy] = useState(false)
  const [linkPreviewOpen, setLinkPreviewOpen] = useState(false)
  const [audioUrl, setAudioUrl] = useState('')
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null)
  const [pendingAudioFile, setPendingAudioFile] = useState<File | null>(null)
  const [mediaSaving, setMediaSaving] = useState(false)
  const [mediaPreparing, setMediaPreparing] = useState(false)

  const articleQuery = useQuery({
    queryKey: ['cms-article', id],
    queryFn: () => getCmsArticle(id!),
    enabled: !isNew,
    refetchInterval: (query) => {
      const translation = query.state.data?.translationStatus
      const narration = query.state.data?.narrationStatus
      const busy =
        translation === 'PENDING' ||
        translation === 'RUNNING' ||
        narration === 'PENDING' ||
        narration === 'RUNNING'
      return busy ? 2000 : false
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

  const tagsQuery = useQuery({
    queryKey: ['cms-tags'],
    queryFn: () => listCmsTags(),
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
      scheduledAt:
        article.status === 'SCHEDULED'
          ? toDatetimeLocalValue(article.publishedAt)
          : '',
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
      sourced: Boolean(article.sourced),
      sponsorName: article.sponsorName ?? '',
      behindStoryBg: article.behindStoryBg ?? '',
      seoTitleBg: article.seoTitleBg ?? '',
      seoDescriptionBg: article.seoDescriptionBg ?? '',
      tagIds: article.tagIds ?? [],
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
    resetOptions: { keepDirtyValues: true },
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
  const status = form.watch('status')
  const scheduledAt = form.watch('scheduledAt')
  const { isDirty, errors } = form.formState
  const profile = getSectionProfile(section)

  useEffect(() => {
    form.setValue(
      'galleryMediaIds',
      gallery.map((item) => item.id),
      { shouldDirty: false },
    )
  }, [gallery, form])

  // Editing a published story returns it to draft until Publish is clicked again.
  const allowPublishDemote = useRef(false)
  useEffect(() => {
    allowPublishDemote.current = false
    const timer = window.setTimeout(() => {
      allowPublishDemote.current = true
    }, 0)
    return () => window.clearTimeout(timer)
  }, [articleQuery.data?.id])

  useEffect(() => {
    const sub = form.watch((_values, info) => {
      if (!allowPublishDemote.current) return
      if (info.type !== 'change') return
      if (!info.name || info.name === 'status') return
      // Synced from local gallery state — demotion happens via noteGalleryEdit.
      if (info.name === 'galleryMediaIds') return
      if (form.getValues('status') !== 'PUBLISHED') return
      // Skip programmatic syncs (shouldDirty: false) that leave the form clean.
      if (!form.formState.isDirty) return
      form.setValue('status', 'DRAFT', { shouldDirty: true })
    })
    return () => sub.unsubscribe()
  }, [form])

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
      revokeIfBlob(audioUrl)
      setPendingAudioFile(null)
      setAudioUrl('')
    }
    if (!nextProfile.showVideoSource) {
      revokeIfBlob(form.getValues('videoUrl'))
      setPendingVideoFile(null)
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
      setMediaSaving(true)
      try {
        const credit = values.photoCreditBg
        const galleryMediaIds: string[] = []

        for (const item of gallery) {
          if (item.file) {
            const media = await uploadCmsMedia(item.file, credit)
            galleryMediaIds.push(media.id)
          } else if (!item.id.startsWith('local-')) {
            galleryMediaIds.push(item.id)
          }
        }

        let audioMediaId = values.audioMediaId || undefined
        if (pendingAudioFile) {
          const media = await uploadCmsMedia(pendingAudioFile)
          audioMediaId = media.id
        }

        let videoMediaId = values.videoMediaId || null
        let videoUrl = values.videoUrl.trim().startsWith('blob:')
          ? null
          : values.videoUrl.trim() || null
        if (pendingVideoFile) {
          const media = await uploadCmsMedia(pendingVideoFile)
          videoMediaId = media.id
          videoUrl = null
        }

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
          dateBg: formatDateBg(
            values.dateIso || values.scheduledAt.slice(0, 10),
          ),
          publishedAt: publishedAtPayload(values.status, values.scheduledAt),
          photoCreditBg: values.photoCreditBg,
          endLabelBg: values.endLabelBg,
          speakerBg: values.speakerBg || undefined,
          audioDuration: sectionProfile.showVideoSource
            ? formatWatchDuration(durationSeconds) || undefined
            : values.audioDuration || undefined,
          authorId: values.authorId || undefined,
          galleryMediaIds,
          heroMediaId: galleryMediaIds[0] || undefined,
          audioMediaId,
          videoUrl,
          videoMediaId,
          featured: values.featured,
          sponsored: values.sponsored,
          sourced: values.sourced,
          sponsorName: values.sponsored
            ? values.sponsorName.trim() || null
            : null,
          behindStoryBg: values.behindStoryBg,
          seoTitleBg: values.seoTitleBg.trim() || null,
          seoDescriptionBg: values.seoDescriptionBg.trim() || null,
          tagIds: values.tagIds,
          body: values.body,
          seriesId:
            values.seriesMode === 'series' && values.seriesId
              ? values.seriesId
              : null,
        }
        if (isNew) return createCmsArticle(payload)
        return updateCmsArticle(id!, payload)
      } finally {
        setMediaSaving(false)
      }
    },
    onSuccess: async (article) => {
      // Drop local blob previews; reload saved remote URLs from the article.
      for (const item of gallery) revokeIfBlob(item.url)
      revokeIfBlob(audioUrl)
      revokeIfBlob(form.getValues('videoUrl'))
      setPendingVideoFile(null)
      setPendingAudioFile(null)
      setGallery(
        article.gallery?.length
          ? article.gallery.map((item) => ({ id: item.id, url: item.url }))
          : article.heroMediaId && article.image
            ? [{ id: article.heroMediaId, url: article.image }]
            : [],
      )
      setAudioUrl(article.audioUrl ?? '')
      form.setValue('videoUrl', article.videoUrl ?? '', { shouldDirty: false })
      form.setValue('videoMediaId', article.videoMediaId ?? '', {
        shouldDirty: false,
      })
      form.setValue('audioMediaId', article.audioMediaId ?? '', {
        shouldDirty: false,
      })

      await queryClient.invalidateQueries({ queryKey: ['cms-articles'] })
      await queryClient.invalidateQueries({ queryKey: ['cms-articles-count'] })
      await queryClient.invalidateQueries({ queryKey: ['cms-series'] })
      if (article.series?.id) {
        await queryClient.invalidateQueries({
          queryKey: ['cms-series-item', article.series.id],
        })
      }
      if (article.status === 'PUBLISHED') {
        navigate(basePath)
        return
      }
      if (isNew) navigate(`${basePath}/${article.id}`, { replace: true })
      else await queryClient.invalidateQueries({ queryKey: ['cms-article', id] })
    },
  })

  const retranslateMutation = useMutation({
    mutationFn: () => queueArticleTranslation(id!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cms-article', id] })
      await queryClient.invalidateQueries({ queryKey: ['cms-articles'] })
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

  const noteGalleryEdit = () => {
    if (form.getValues('status') === 'PUBLISHED') {
      form.setValue('status', 'DRAFT', { shouldDirty: true })
    } else {
      form.setValue(
        'galleryMediaIds',
        form.getValues('galleryMediaIds'),
        { shouldDirty: true },
      )
    }
  }

  const noteUnpublishedEdit = () => {
    if (form.getValues('status') === 'PUBLISHED') {
      form.setValue('status', 'DRAFT', { shouldDirty: true })
    }
  }

  /** Local preview only — MinIO upload happens on Save/Publish. */
  const pickImages = async (files: FileList | null) => {
    if (!files?.length) return
    setMediaPreparing(true)
    try {
      const list = Array.from(files)
      const items: GalleryItem[] = list.map((file) => ({
        id: `local-${randomId()}`,
        url: URL.createObjectURL(file),
        file,
      }))
      await Promise.all(items.map((item) => preloadImageUrl(item.url)))
      const startIndex = gallery.length
      setGallery((prev) => [...prev, ...items])
      setActiveSlide(startIndex)
      noteGalleryEdit()
    } finally {
      setMediaPreparing(false)
    }
  }

  /** Replace poster/cover with a local preview (no upload until save). */
  const pickPoster = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setMediaPreparing(true)
    try {
      const url = URL.createObjectURL(file)
      await preloadImageUrl(url)
      setGallery((prev) => {
        for (const item of prev) revokeIfBlob(item.url)
        return [
          {
            id: `local-${randomId()}`,
            url,
            file,
          },
        ]
      })
      noteGalleryEdit()
    } finally {
      setMediaPreparing(false)
    }
  }

  const setPosterFromBlob = async (blob: Blob, filename = 'poster.jpg') => {
    const file = new File([blob], filename, {
      type: blob.type || 'image/jpeg',
    })
    const url = URL.createObjectURL(file)
    await preloadImageUrl(url)
    setGallery((prev) => {
      for (const item of prev) revokeIfBlob(item.url)
      return [
        {
          id: `local-${randomId()}`,
          url,
          file,
        },
      ]
    })
  }

  const pickVideoFile = async (file: File) => {
    setMediaPreparing(true)
    setPosterBusy(true)
    setLinkPreviewOpen(false)
    try {
      const previousUrl = form.getValues('videoUrl')
      revokeIfBlob(previousUrl)
      const localUrl = URL.createObjectURL(file)
      setPendingVideoFile(file)
      form.setValue('videoUrl', localUrl, { shouldDirty: true })
      form.setValue('videoMediaId', '', { shouldDirty: true })

      try {
        const captured = await captureVideoPosterBlob(file)
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
        await setPosterFromBlob(captured.blob)
      } catch {
        /* video preview still works without auto poster */
      }
    } finally {
      setPosterBusy(false)
      setMediaPreparing(false)
    }
  }

  const previewExternalLink = async () => {
    const url = form.getValues('videoUrl').trim()
    const thumb = getRemotePosterUrl(url)
    if (!thumb) return
    setLinkPreviewOpen(true)
    setMediaPreparing(true)
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
      setMediaPreparing(false)
    }
  }

  const pickAudioFile = async (file: File) => {
    setMediaPreparing(true)
    try {
      revokeIfBlob(audioUrl)
      const localUrl = URL.createObjectURL(file)
      setPendingAudioFile(file)
      setAudioUrl(localUrl)
      form.setValue('audioMediaId', '', { shouldDirty: true })

      await new Promise<void>((resolve) => {
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
    } finally {
      setMediaPreparing(false)
    }
  }

  const videoPlayback = resolveVideoPlayback(videoUrlValue)
  const hasVideoSource = Boolean(
    videoUrlValue.trim() || videoMediaIdValue || pendingVideoFile,
  )
  const isFileVideo =
    Boolean(videoMediaIdValue || pendingVideoFile) ||
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
      const doomed = prev.find((item) => item.id === mediaId)
      revokeIfBlob(doomed?.url)
      return prev.filter((item) => item.id !== mediaId)
    })
    noteGalleryEdit()
  }

  const clearVideo = () => {
    revokeIfBlob(form.getValues('videoUrl'))
    setPendingVideoFile(null)
    form.setValue('videoUrl', '', { shouldDirty: true })
    form.setValue('videoMediaId', '', { shouldDirty: true })
  }

  const clearAudio = () => {
    revokeIfBlob(audioUrl)
    setPendingAudioFile(null)
    setAudioUrl('')
    form.setValue('audioMediaId', '', { shouldDirty: true })
    form.setValue('audioDuration', '', { shouldDirty: true })
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
    noteGalleryEdit()
  }

  const goPrev = () => {
    setActiveSlide((prev) => (prev <= 0 ? gallery.length - 1 : prev - 1))
  }

  const goNext = () => {
    setActiveSlide((prev) => (prev >= gallery.length - 1 ? 0 : prev + 1))
  }

  const onSubmit = form.handleSubmit(async (values) => {
    await saveMutation.mutateAsync(values)
  })

  const submitStatus = (next: EditorSaveAction) => {
    let statusToSave: EditorSaveAction = next
    if (next === 'SCHEDULED') {
      let at = form.getValues('scheduledAt')
      if (!at.trim()) {
        at = defaultScheduleLocal()
        form.setValue('scheduledAt', at, { shouldDirty: true })
      }
      if (isScheduleDueNow(at)) statusToSave = 'PUBLISHED'
    }
    void form.handleSubmit((values) =>
      saveMutation.mutateAsync({ ...values, status: statusToSave }),
    )()
  }

  if (!isNew && articleQuery.isLoading) {
    return (
      <p className="text-sm text-stone-500">{t('cms.editor.loading')}</p>
    )
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

  const mediaBusy = mediaSaving || mediaPreparing || posterBusy
  const editorDirty = isDirty || Boolean(pendingAudioFile || pendingVideoFile)
  const editorBusy = saveMutation.isPending || mediaBusy
  const savedStatus = articleQuery.data?.status
  const thirdAction: EditorSaveAction =
    status === 'SCHEDULED' || status === 'ARCHIVED' ? status : 'PUBLISHED'
  const actionDisabled = (action: EditorSaveAction) =>
    editorActionDisabled({
      action,
      savedStatus,
      selectedStatus: status,
      dirty: editorDirty,
      busy: editorBusy,
      isNew,
    })

  const MediaPrepOverlay = ({ label }: { label?: string }) =>
    mediaPreparing || posterBusy ? (
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#FDFBF7]/80 backdrop-blur-[2px]">
        <Loader2 className="size-7 animate-spin text-[#0C2686]" />
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
          {label || t('cms.editor.preparingMedia')}
        </span>
      </div>
    ) : null

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-[#E8E4DC] pb-4">
        <Link
          to={basePath}
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 transition-colors hover:text-[#0C2686]"
        >
          <ArrowLeft className="size-4" />
          {t('cms.editor.back')}
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={status} />
          {articleQuery.data?.status === 'PUBLISHED' && status === 'DRAFT' ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
              {t('cms.editor.unpublishedEdits')}
            </span>
          ) : null}
          {articleQuery.data?.translationStatus && (
            <StatusPill status={articleQuery.data.translationStatus} />
          )}
          <EditorActionButton
            type="button"
            primary={status === 'REVIEW'}
            onClick={() => submitStatus('REVIEW')}
            disabled={actionDisabled('REVIEW')}
          >
            {t('cms.editor.review')}
          </EditorActionButton>
          <EditorActionButton
            type="button"
            primary={status === 'DRAFT'}
            onClick={() => submitStatus('DRAFT')}
            disabled={actionDisabled('DRAFT')}
          >
            <Save className="size-4" /> {t('cms.editor.saveDraft')}
          </EditorActionButton>
          <EditorActionButton
            type="button"
            primary={status === thirdAction}
            onClick={() => submitStatus(thirdAction)}
            disabled={actionDisabled(thirdAction)}
          >
            {thirdAction === 'SCHEDULED' ? (
              <>
                <Clock className="size-4" /> {t('cms.editor.schedule')}
              </>
            ) : thirdAction === 'ARCHIVED' ? (
              t('cms.editor.archive')
            ) : (
              t('cms.editor.publish')
            )}
          </EditorActionButton>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-8">
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
        className="grid grid-cols-1 gap-8 overflow-x-hidden xl:grid-cols-[minmax(0,1fr)_320px]"
      >
        <div className="min-w-0 space-y-6 overflow-x-hidden">
          <CmsCard className="space-y-3 p-5">
            <h2 className="text-sm font-semibold text-stone-800">
              {t('cms.editor.sectionHint')}
            </h2>
            <JournalSelect
              name="section"
              variant="boxed"
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
                <label className="relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#E8E4DC] bg-[#FAF8F3] px-6 py-16 text-center transition-colors hover:border-[#0C2686]/40">
                  <MediaPrepOverlay />
                  <Film className="size-8 text-[#0C2686]" />
                  <span className="text-sm font-medium text-stone-600">
                    {mediaBusy
                      ? t('cms.editor.preparingMedia')
                      : t('cms.editor.addVideo')}
                  </span>
                  <span className="text-[11px] text-stone-400">
                    {t('cms.editor.uploadVideo')}
                  </span>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    disabled={mediaBusy}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      await pickVideoFile(file)
                      e.target.value = ''
                    }}
                  />
                </label>
              ) : (
                <div className="relative space-y-3">
                  <MediaPrepOverlay />
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
                      {mediaBusy
                        ? t('cms.editor.preparingMedia')
                        : t('cms.editor.replaceVideo')}
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        disabled={mediaBusy}
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          await pickVideoFile(file)
                          e.target.value = ''
                        }}
                      />
                    </label>
                    <GhostButton
                      type="button"
                      className="py-2 text-xs"
                      onClick={() => {
                        clearVideo()
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
                    {mediaBusy
                      ? t('cms.editor.preparingMedia')
                      : t('cms.editor.uploadPoster')}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={mediaBusy}
                      onChange={async (e) => {
                        await pickPoster(e.target.files)
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>
                {gallery[0] ? (
                  <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-[#E8E4DC] bg-stone-100">
                    <MediaPrepOverlay />
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
                    <MediaPrepOverlay />
                    <img
                      src={remoteThumb}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="relative rounded-2xl border border-dashed border-[#E8E4DC] bg-white px-6 py-8 text-center text-xs text-stone-400">
                    <MediaPrepOverlay />
                    {posterBusy
                      ? t('cms.editor.generatingPoster')
                      : mediaPreparing
                        ? t('cms.editor.preparingMedia')
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
                <label className="relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#E8E4DC] bg-[#FAF8F3] px-6 py-16 text-center transition-colors hover:border-[#0C2686]/40">
                  <MediaPrepOverlay />
                  <Headphones className="size-8 text-[#0C2686]" />
                  <span className="text-sm font-medium text-stone-600">
                    {mediaBusy
                      ? t('cms.editor.preparingMedia')
                      : t('cms.editor.addAudio')}
                  </span>
                  <span className="text-[11px] text-stone-400">
                    {t('cms.editor.uploadAudio')}
                  </span>
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    disabled={mediaBusy}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      await pickAudioFile(file)
                      e.target.value = ''
                    }}
                  />
                </label>
              ) : (
                <div className="relative space-y-4">
                  <MediaPrepOverlay />
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
                      {mediaBusy
                        ? t('cms.editor.preparingMedia')
                        : t('cms.editor.replaceAudio')}
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        disabled={mediaBusy}
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          await pickAudioFile(file)
                          e.target.value = ''
                        }}
                      />
                    </label>
                    <GhostButton
                      type="button"
                      className="py-2 text-xs"
                      onClick={() => clearAudio()}
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
                    {mediaBusy
                      ? t('cms.editor.preparingMedia')
                      : gallery[0]
                        ? t('cms.editor.audioCoverChange')
                        : t('cms.editor.audioCoverUpload')}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={mediaBusy}
                      onChange={async (e) => {
                        await pickPoster(e.target.files)
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>
                {gallery[0] ? (
                  <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-[#E8E4DC] bg-stone-100">
                    <MediaPrepOverlay />
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
                  <label className="relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E8E4DC] bg-white px-6 py-10 text-center transition-colors hover:border-[#0C2686]/40">
                    <MediaPrepOverlay />
                    <ImagePlus className="size-6 text-stone-400" />
                    <span className="text-xs font-medium text-stone-500">
                      {mediaBusy
                        ? t('cms.editor.preparingMedia')
                        : t('cms.editor.audioCoverUpload')}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={mediaBusy}
                      onChange={async (e) => {
                        await pickPoster(e.target.files)
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
                  {mediaBusy
                    ? t('cms.editor.preparingMedia')
                    : t('cms.editor.addImages')}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={mediaBusy}
                    onChange={async (e) => {
                      await pickImages(e.target.files)
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>
            </div>

            {gallery.length === 0 ? (
              <label className="relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#E8E4DC] bg-[#FAF8F3] px-6 py-16 text-center transition-colors hover:border-[#0C2686]/40">
                <MediaPrepOverlay />
                <ImagePlus className="size-8 text-[#0C2686]" />
                <span className="text-sm font-medium text-stone-600">
                  {mediaBusy
                    ? t('cms.editor.preparingMedia')
                    : t('cms.editor.addImages')}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={mediaBusy}
                  onChange={async (e) => {
                    await pickImages(e.target.files)
                    e.target.value = ''
                  }}
                />
              </label>
            ) : galleryView === 'slider' ? (
              <div className="relative max-w-full space-y-3 overflow-x-hidden">
                <MediaPrepOverlay />
                <div className="relative h-[min(14rem,32vh)] w-full overflow-hidden rounded-2xl border border-[#E8E4DC] bg-stone-100">
                  <img
                    src={gallery[activeSlide]?.url}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
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
                  <div className="max-w-full overflow-x-auto overflow-y-hidden pb-1">
                    <div className="flex w-max gap-2">
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
                            item.file && 'ring-1 ring-amber-400/70',
                          )}
                        />
                        {item.file && (
                          <span className="absolute inset-x-0 top-0 bg-amber-400/90 py-0.5 text-center text-[8px] font-semibold uppercase text-[#1A1A1A]">
                            new
                          </span>
                        )}
                        {index === 0 && (
                          <span className="absolute inset-x-0 bottom-0 bg-[#0C2686]/90 py-0.5 text-center text-[9px] font-semibold uppercase text-white">
                            {t('cms.editor.heroLabel')}
                          </span>
                        )}
                      </button>
                    ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                <MediaPrepOverlay />
                {gallery.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveSlide(index)
                      setGalleryView('slider')
                    }}
                    className="group relative aspect-square max-h-44 overflow-hidden rounded-xl border border-[#E8E4DC] bg-stone-100 text-left"
                  >
                    <img
                      src={item.url}
                      alt=""
                      className={cn(
                        'h-full w-full object-cover transition group-hover:scale-105',
                        item.file && 'ring-1 ring-amber-400/70',
                      )}
                    />
                    {item.file && (
                      <span className="absolute inset-x-0 top-0 bg-amber-400/90 py-0.5 text-center text-[8px] font-semibold uppercase text-[#1A1A1A]">
                        new
                      </span>
                    )}
                    {index === 0 && (
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
            <CmsRadioGroup>
              <CmsRadio
                name="seriesMode"
                checked={seriesMode === 'standalone'}
                onChange={() => {
                  form.setValue('seriesMode', 'standalone', {
                    shouldDirty: true,
                  })
                  form.setValue('seriesId', '', { shouldDirty: true })
                }}
                label={t('cms.series.standalone')}
              />
              <CmsRadio
                name="seriesMode"
                checked={seriesMode === 'series'}
                onChange={() =>
                  form.setValue('seriesMode', 'series', { shouldDirty: true })
                }
                label={t('cms.series.partOfSeries')}
              />
            </CmsRadioGroup>

            {seriesMode === 'series' && (
              <div className="space-y-3 border-t border-[#E8E4DC] pt-3">
                <div className="space-y-1 text-xs">
                  <span>{t('cms.series.selectSeries')}</span>
                  <JournalSelect
                    name="seriesId"
                    variant="boxed"
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

          <AiAssistantPanel
            articleId={isNew ? undefined : id}
            titleBg={form.watch('titleBg')}
            subtitleBg={form.watch('subtitleBg')}
            section={section}
            bodyText={form
              .watch('body')
              .map((block) =>
                block.type === 'note'
                  ? `${block.labelBg}\n${block.textBg}`
                  : block.textBg,
              )
              .join('\n\n')}
            lang={lang}
            onApply={(patch) => {
              if (patch.titleBg) {
                form.setValue('titleBg', patch.titleBg, { shouldDirty: true })
              }
              if (patch.subtitleBg) {
                form.setValue('subtitleBg', patch.subtitleBg, {
                  shouldDirty: true,
                })
              }
              if (patch.seoTitleBg) {
                form.setValue('seoTitleBg', patch.seoTitleBg, {
                  shouldDirty: true,
                })
              }
              if (patch.seoDescriptionBg) {
                form.setValue('seoDescriptionBg', patch.seoDescriptionBg, {
                  shouldDirty: true,
                })
              }
            }}
          />

          {!isNew && articleQuery.data ? (
            <CmsCard className="space-y-3 p-5">
              <h3 className="text-sm font-semibold">
                {t('cms.editor.translation')}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={articleQuery.data.translationStatus} />
                {articleQuery.data.sourceLang ? (
                  <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-600">
                    {t('cms.editor.detectedLang', {
                      lang: articleQuery.data.sourceLang.toUpperCase(),
                    })}
                  </span>
                ) : null}
              </div>
              {articleQuery.data.translationStatus === 'FAILED' &&
              articleQuery.data.translationError ? (
                <p className="text-xs text-rose-700">
                  {articleQuery.data.translationError}
                </p>
              ) : null}
              <GhostButton
                type="button"
                className="w-full text-xs"
                disabled={retranslateMutation.isPending}
                onClick={() => retranslateMutation.mutate()}
              >
                {retranslateMutation.isPending
                  ? t('cms.editor.retranslating')
                  : t('cms.editor.retranslate')}
              </GhostButton>
            </CmsCard>
          ) : null}

          {!isNew && articleQuery.data ? (
            <NarrationPanel
              articleId={id!}
              article={articleQuery.data}
              audioUrl={audioUrl || articleQuery.data.audioUrl || undefined}
              onQueued={noteUnpublishedEdit}
            />
          ) : null}

          <CmsCard className="space-y-4 p-5">
            <h3 className="text-sm font-semibold">{t('cms.editor.publishing')}</h3>
            <div className="space-y-1 text-xs">
              <span>{t('cms.editor.status')}</span>
              <JournalSelect
                name="status"
                variant="boxed"
                label={t('cms.editor.status')}
                placeholder={t('cms.editor.status')}
                options={statusOptions}
                value={form.watch('status')}
                onChange={(value) => {
                  const next = value as ArticleFormValues['status']
                  form.setValue('status', next, { shouldDirty: true })
                  if (next === 'SCHEDULED' && !form.getValues('scheduledAt')) {
                    form.setValue('scheduledAt', defaultScheduleLocal(), {
                      shouldDirty: true,
                    })
                  }
                }}
              />
            </div>
            {status === 'SCHEDULED' ? (
              <div className="space-y-2 rounded-xl border border-[#E8E4DC] bg-[#FAF8F3] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  {t('cms.editor.scheduleAt')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1 text-xs">
                    {t('cms.editor.scheduleDate')}
                    <input
                      type="date"
                      lang="bg-BG"
                      className="w-full border border-[#E8E4DC] bg-white px-2 py-2"
                      value={splitDatetimeLocal(scheduledAt).date}
                      onChange={(event) =>
                        form.setValue(
                          'scheduledAt',
                          joinDatetimeLocal(
                            event.target.value,
                            splitDatetimeLocal(scheduledAt).time,
                          ),
                          { shouldDirty: true },
                        )
                      }
                    />
                  </label>
                  <label className="block space-y-1 text-xs">
                    {t('cms.editor.scheduleTime')}
                    <input
                      type="time"
                      className="w-full border border-[#E8E4DC] bg-white px-2 py-2"
                      value={splitDatetimeLocal(scheduledAt).time}
                      onChange={(event) =>
                        form.setValue(
                          'scheduledAt',
                          joinDatetimeLocal(
                            splitDatetimeLocal(scheduledAt).date,
                            event.target.value,
                          ),
                          { shouldDirty: true },
                        )
                      }
                    />
                  </label>
                </div>
                <p className="text-[11px] text-stone-500">
                  {t('cms.editor.scheduleHint')}
                </p>
                {errors.scheduledAt ? (
                  <p className="text-[11px] text-rose-700">
                    {t('cms.editor.scheduleRequired')}
                  </p>
                ) : null}
              </div>
            ) : null}
            <CmsCheckbox
              checked={form.watch('featured')}
              onChange={() =>
                form.setValue('featured', !form.getValues('featured'), {
                  shouldDirty: true,
                })
              }
              label={t('cms.editor.featured')}
            />
            <CmsCheckbox
              checked={form.watch('sponsored')}
              onChange={() =>
                form.setValue('sponsored', !form.getValues('sponsored'), {
                  shouldDirty: true,
                })
              }
              label={t('cms.editor.sponsored')}
            />
            {form.watch('sponsored') ? (
              <CmsField label={t('cms.editor.sponsorName')}>
                <CmsInput
                  placeholder={t('cms.editor.sponsorNamePlaceholder')}
                  {...form.register('sponsorName')}
                />
              </CmsField>
            ) : null}
            <CmsCheckbox
              checked={form.watch('sourced')}
              onChange={() =>
                form.setValue('sourced', !form.getValues('sourced'), {
                  shouldDirty: true,
                })
              }
              label={t('cms.editor.sourced')}
            />

            <CmsField label={t('cms.editor.behindStory')}>
              <CmsTextarea rows={4} {...form.register('behindStoryBg')} />
            </CmsField>
            <CmsField label={t('cms.editor.seoTitle')}>
              <CmsInput {...form.register('seoTitleBg')} />
            </CmsField>
            <CmsField label={t('cms.editor.seoDescription')}>
              <CmsInput {...form.register('seoDescriptionBg')} />
            </CmsField>

            <div className="space-y-2 border-t border-[#E8E4DC] pt-3">
              <p className="text-xs font-semibold text-stone-700">
                {t('cms.editor.tags')}
              </p>
              <p className="text-[11px] text-stone-500">
                {t('cms.editor.tagsHint')}
              </p>
              <CmsTagPicker
                tags={tagsQuery.data ?? []}
                kinds={['LOCATION', 'TOPIC']}
                value={form.watch('tagIds')}
                loading={tagsQuery.isLoading}
                onChange={(next) =>
                  form.setValue('tagIds', next, { shouldDirty: true })
                }
                onCreateTag={async (input) => {
                  const tag = await createCmsTag(input)
                  await queryClient.invalidateQueries({ queryKey: ['cms-tags'] })
                  return tag
                }}
              />
            </div>
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
                    variant="boxed"
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
              variant="boxed"
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

          {form.formState.isSubmitted && Object.keys(errors).length > 0 ? (
            <p className="text-sm text-rose-700">
              {t('cms.editor.validationFailed')}
            </p>
          ) : null}
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
    </div>
  )
}
