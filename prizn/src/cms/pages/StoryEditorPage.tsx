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
  Film,
  Headphones,
  ImagePlus,
  LayoutGrid,
  Loader2,
  Plus,
  Save,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
  GhostButton,
  PrimaryButton,
  StatusPill,
} from '@/cms/components/CmsUI'
import { useCmsConfirm } from '@/cms/components/CmsConfirmDialog'
import { CmsModal } from '@/cms/components/CmsModal'
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
import { NarrationPanel, type AudioChange } from '@/cms/components/NarrationPanel'
import { StoryBodyEditor } from '@/cms/components/StoryBodyEditor'
import { StoryRichTextField } from '@/cms/components/StoryRichTextField'
import { StoryGalleryThumbs } from '@/cms/components/StoryGalleryThumbs'
import { useImageFileDrop } from '@/cms/hooks/useImageFileDrop'
import { JournalSelect } from '@/components/ui/JournalSelect'
import { arrayMove } from '@dnd-kit/sortable'
import {
  createCmsArticle,
  createCmsAuthor,
  deleteCmsArticle,
  getCmsArticle,
  listCmsAuthors,
  queueArticleTranslation,
  requestArticleChanges,
  updateCmsArticle,
  uploadCmsMedia,
} from '@/lib/articles-api'
import {
  createCmsSeries,
  listCmsSeries,
} from '@/lib/cms-content-api'
import {
  type ArticleFormValues,
  type ArticleSection,
  type BodyBlock,
} from '@/lib/cms-types'
import { createCmsTag, listCmsTags } from '@/lib/tags-api'
import { listCmsCategories } from '@/lib/categories-api'
import { categorySelectOptions, primaryCategoryId, slugsForCategory } from '@/lib/category-tree'
import { sectionFromCategorySlugs } from '@/lib/category-section'
import { ApiError } from '@/lib/api'
import { assertCmsFileSize } from '@/lib/upload-limits'
import { useJournalLang } from '@/hooks/useJournalLang'
import { pickLang } from '@/lib/pick-lang'
import { cn, randomId } from '@/lib/utils'
import { getSectionProfile } from '@/cms/section-profiles'
import { useAuth } from '@/lib/auth'
import {
  canManageAllStories,
  canPublishStories,
  isCmsStaff,
  isCmsSuperAdmin,
} from '@/lib/cms-roles'
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
import { parseDateBgToIso, toSofiaDateIso } from '@/lib/format-date'
import {
  stripEmptyBodyBlocks,
  validateStoryForPublish,
} from '@/lib/translation-quality'
import {
  AUTOSAVE_IDLE_MS,
  autosaveStatus,
  clearStoryDraft,
  readStoryDraft,
  serializeStoryDraft,
  shouldAutosaveDraft,
  shouldRestoreStoryDraft,
  writeStoryDraft,
} from '@/cms/pages/story-editor-autosave'
import {
  estimateReadMinutes,
  splitPastedParagraphs,
  toFormBodyBlock,
  compactBody,
  draftPlainTextForAi,
  dropGalleryMedia,
  remapBodyMediaIds,
  syncBodyImagesWithGallery,
} from '@/cms/pages/story-editor-body'
import {
  embedVideoMediaId,
  isEmbedVideoItem,
  mediaSaveFields,
  mediaThumbUrl,
  mergeBodyVideosIntoGallery,
  mergeLoadedMedia,
  type StoryMediaItem,
} from '@/cms/pages/story-editor-media'
import {
  captureVideoPosterBlob,
  formatWatchDuration,
  getRemotePosterUrl,
  resolveVideoPlayback,
} from '@/lib/video-playback'

const blockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('paragraph'),
    textBg: z.string(),
  }),
  z.object({
    type: z.literal('pullquote'),
    textBg: z.string(),
    citeBg: z.string(),
  }),
  z.object({
    type: z.literal('note'),
    labelBg: z.string().min(1),
    textBg: z.string(),
  }),
  z.object({
    type: z.literal('caption'),
    textBg: z.string(),
  }),
  z.object({
    type: z.literal('image'),
    mediaId: z.string().optional(),
    url: z.string().optional(),
    captionBg: z.string(),
  }),
  z.object({
    type: z.literal('video'),
    mediaId: z.string().optional(),
    url: z.string().optional(),
    captionBg: z.string(),
  }),
  z.object({
    type: z.literal('collage'),
    layout: z.string(),
    captionBg: z.string(),
    items: z.array(
      z.object({
        mediaId: z.string().optional(),
        url: z.string().optional(),
        captionBg: z.string(),
      }),
    ),
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
  categoryIds: z.array(z.string()),
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
  categoryIds: [],
  body: [{ type: 'paragraph', textBg: '' }],
  seriesMode: 'standalone',
  seriesId: '',
}

function ensureTeaserParagraph(body: BodyBlock[]): BodyBlock[] {
  const withTeaser =
    body[0]?.type === 'paragraph'
      ? body
      : [{ type: 'paragraph' as const, textBg: '' }, ...body]
  if (withTeaser.length === 1) {
    return [...withTeaser, { type: 'paragraph', textBg: '' }]
  }
  return withTeaser
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
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? new Date(`${iso}T12:00:00`)
    : new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('bg-BG', {
    timeZone: 'Europe/Sofia',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

type GalleryItem = StoryMediaItem

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
  const { confirm, dialog } = useCmsConfirm()
  const { user } = useAuth()
  const canPickAuthor = canManageAllStories(user)
  const canCreateAuthor = isCmsStaff(user)
  const canDeleteStory = isCmsSuperAdmin(user)
  const canPublish = canPublishStories(user)
  const basePath = '/cms/stories'
  const routeIsNew = !id || id === 'new'
  const [savedArticleId, setSavedArticleId] = useState<string | null>(
    routeIsNew ? null : id!,
  )
  /** Route may still be /new after autosave; prefer the persisted id. */
  const isNew = !savedArticleId
  const articleId = savedArticleId
  const querySeriesId = searchParams.get('seriesId') || ''
  const [gallery, setGallery] = useState<GalleryItem[]>([])
  const [activeSlide, setActiveSlide] = useState(0)
  const [galleryView, setGalleryView] = useState<'slider' | 'grid'>('slider')
  const [mediaTab, setMediaTab] = useState<'image' | 'video'>('image')
  const [showAuthorForm, setShowAuthorForm] = useState(false)
  const [newAuthorName, setNewAuthorName] = useState('')
  const [newAuthorGuest, setNewAuthorGuest] = useState(false)
  const [showCreateSeries, setShowCreateSeries] = useState(false)
  const [newSeriesTitle, setNewSeriesTitle] = useState('')
  const [posterBusy, setPosterBusy] = useState(false)
  const [audioUrl, setAudioUrl] = useState('')
  const [pendingAudioFile, setPendingAudioFile] = useState<File | null>(null)
  /** Audio was uploaded/removed in the editor and must be sent on the next save. */
  const [audioTouched, setAudioTouchedState] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const audioTouchedRef = useRef(false)
  const setAudioTouched = (next: boolean) => {
    audioTouchedRef.current = next
    setAudioTouchedState(next)
  }
  /** Files already uploaded by an autosave, reused so the next save doesn't upload them again. */
  const uploadedGalleryRef = useRef(new Map<string, string>())
  const uploadedAudioRef = useRef<{ file: File; id: string } | null>(null)
  const [mediaSaving, setMediaSaving] = useState(false)
  const [mediaPreparing, setMediaPreparing] = useState(false)
  const [readTimeManual, setReadTimeManual] = useState(() => !isNew)
  const [savingAction, setSavingAction] = useState<EditorSaveAction | null>(null)
  const savingLock = useRef(false)
  const queuedStatus = useRef<EditorSaveAction | null>(null)
  const restoredDraft = useRef(false)
  const lastSavedSnapshot = useRef('')
  const createdIdRef = useRef<string | null>(savedArticleId)
  const silentSave = useRef(false)
  const persistSilentDraftRef = useRef<() => Promise<void>>(async () => {})
  const scheduleAutosaveRef = useRef<() => void>(() => {})
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )
  const localBackupTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )
  const editorDirtyRef = useRef(false)
  const editorBusyRef = useRef(false)
  const hydratedArticleId = useRef<string | null>(null)
  const submitStatusRef = useRef<(next: EditorSaveAction) => void>(() => undefined)
  const [autosaveState, setAutosaveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')

  const articleQuery = useQuery({
    queryKey: ['cms-article', articleId],
    queryFn: () => getCmsArticle(articleId!),
    enabled: Boolean(articleId),
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

  useEffect(() => {
    if (id && id !== 'new') setSavedArticleId(id)
  }, [id])

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

  const categoriesQuery = useQuery({
    queryKey: ['cms-categories'],
    queryFn: listCmsCategories,
  })

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
    const rawSection =
      article.section === 'human_stories' ? 'human-stories' : article.section
    const isLegacyFeaturedSection = rawSection === 'featured'
    const storedSection = (
      isLegacyFeaturedSection ? 'human-stories' : rawSection
    ) as ArticleFormValues['section']
    // Prefer section derived from linked categories so a desynced DB row
    // (e.g. category=Events, section=places) shows the Events form, not Places.
    const categorySlugs = (article.categories ?? []).map((row) => row.slug)
    const section = (
      categorySlugs.length > 0
        ? sectionFromCategorySlugs(categorySlugs, storedSection)
        : storedSection
    ) as ArticleFormValues['section']
    const mappedBody =
      article.bodyRaw && article.bodyRaw.length > 0
        ? article.bodyRaw.map((block) =>
            toFormBodyBlock(
              block,
              block.type === 'image' || block.type === 'video'
                ? article.gallery?.find((item) => item.id === block.mediaId)
                    ?.url
                : undefined,
            ),
          )
        : [{ type: 'paragraph' as const, textBg: '' }]
    const galleryItems = mergeBodyVideosIntoGallery(
      mergeLoadedMedia(article),
      article.bodyRaw,
    )
    const withTeaser = getSectionProfile(section).showTeaser
      ? ensureTeaserParagraph(mappedBody)
      : mappedBody
    return {
      section,
      status: article.status,
      categoryBg: article.categoryBg,
      titleBg: article.titleBg,
      subtitleBg: article.subtitleBg,
      readTimeMinutes: readTime.amount,
      readTimeUnit:
        article.section === 'video' ? 'minutes' : readTime.unit,
      locationBg: article.locationBg,
      // Prefer editorial dateBg so a prior backdate still fills the Date menu
      // even if publishedAt was stamped to "now" on an older publish.
      dateIso:
        parseDateBgToIso(article.dateBg) ||
        toSofiaDateIso(article.publishedAt) ||
        '',
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
      featured: Boolean(article.featured) || isLegacyFeaturedSection,
      sponsored: article.sponsored,
      sourced: Boolean(article.sourced),
      sponsorName: article.sponsorName ?? '',
      behindStoryBg: article.behindStoryBg ?? '',
      seoTitleBg: article.seoTitleBg ?? '',
      seoDescriptionBg: article.seoDescriptionBg ?? '',
      tagIds: article.tagIds ?? [],
      categoryIds: article.categoryIds ?? [],
      body: syncBodyImagesWithGallery(withTeaser, galleryItems),
      seriesMode: article.series ? 'series' : 'standalone',
      seriesId: article.series?.id ?? '',
    }
  }, [articleQuery.data, isNew, querySeriesId])

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues:
      isNew && querySeriesId
        ? { ...emptyDefaults, seriesMode: 'series', seriesId: querySeriesId }
        : emptyDefaults,
  })

  const { fields, insert, update, remove, replace, move } = useFieldArray({
    control: form.control,
    name: 'body',
  })

  /** Sets value and saved baseline together, so the field no longer counts as an edit. */
  const resetAudioField = (
    name: 'audioMediaId' | 'audioDuration',
    defaultValue?: string,
  ) => {
    // resetField() skips unregistered fields, and form.reset() drops registrations.
    form.register(name)
    form.resetField(name, defaultValue === undefined ? undefined : { defaultValue })
  }

  useEffect(() => {
    hydratedArticleId.current = null
  }, [id])

  useEffect(() => {
    if (isNew) return
    const article = articleQuery.data
    if (!article) return
    if (hydratedArticleId.current === article.id) return
    hydratedArticleId.current = article.id
    form.reset(defaults)
    setAudioUrl(article.audioUrl ?? '')
    setAudioTouched(false)
    setGallery(
      mergeBodyVideosIntoGallery(mergeLoadedMedia(article), article.bodyRaw),
    )
  }, [articleQuery.data, defaults, form, isNew])

  const serverAudioId = articleQuery.data?.audioMediaId ?? ''
  const serverAudioUrl = articleQuery.data?.audioUrl ?? ''

  // Generated narration lands on the server after the job finishes; mirror it
  // into the form unless the editor has its own unsaved audio change.
  useEffect(() => {
    if (audioTouched || !articleQuery.data) return
    if (form.getValues('audioMediaId') !== serverAudioId) {
      resetAudioField('audioMediaId', serverAudioId)
    }
    setAudioUrl((current) => {
      if (current === serverAudioUrl) return current
      revokeIfBlob(current)
      return serverAudioUrl
    })
  }, [articleQuery.data, audioTouched, form, serverAudioId, serverAudioUrl])

  const section = form.watch('section')
  const seriesMode = form.watch('seriesMode')
  const seriesId = form.watch('seriesId')
  const status = form.watch('status')
  const scheduledAt = form.watch('scheduledAt')
  const { isDirty, errors } = form.formState
  const profile = getSectionProfile(section)
  const bodyBlocks = form.watch('body')
  const estimatedMinutes = estimateReadMinutes(bodyBlocks)
  const mediaBusy = mediaSaving || mediaPreparing || posterBusy
  const editorDirty =
    isDirty ||
    Boolean(pendingAudioFile) ||
    gallery.some((item) => Boolean(item.file))
  const editorBusy = mediaBusy || savingAction !== null
  editorDirtyRef.current = editorDirty
  editorBusyRef.current = editorBusy

  useEffect(() => {
    if (readTimeManual || profile.showVideoSource) return
    form.setValue('readTimeMinutes', estimatedMinutes, { shouldDirty: false })
    form.setValue('readTimeUnit', 'minutes', { shouldDirty: false })
  }, [estimatedMinutes, form, profile.showVideoSource, readTimeManual])

  useEffect(() => {
    form.setValue(
      'galleryMediaIds',
      gallery.map((item) => item.id),
      { shouldDirty: false },
    )
  }, [gallery, form])

  const applySection = (next: ArticleSection, dirty = true) => {
    const nextProfile = getSectionProfile(next)
    form.setValue('section', next, { shouldDirty: dirty })
    form.setValue('categoryBg', nextProfile.defaultCategoryBg, {
      shouldDirty: dirty,
    })
    // Audio (uploaded or generated) is valid for every section, so switching
    // section keeps it; only the voices-specific speaker field is cleared.
    if (!nextProfile.showSpeakerAudio) {
      form.setValue('speakerBg', '', { shouldDirty: dirty })
      if (!form.getValues('audioMediaId') && !pendingAudioFile) {
        form.setValue('audioDuration', '', { shouldDirty: dirty })
      }
    }
    if (nextProfile.showTeaser) {
      const body = form.getValues('body')
      const ensured = ensureTeaserParagraph(body)
      if (ensured !== body) {
        replace(ensured)
      }
    }
  }

  const applyCategory = (id: string, dirty = true) => {
    const categories = categoriesQuery.data ?? []
    const selected = categories.find((row) => row.id === id)
    const nextSection = sectionFromCategorySlugs(
      slugsForCategory(selected),
      form.getValues('section'),
    )
    applySection(nextSection, dirty)
    form.setValue('categoryIds', id ? [id] : [], { shouldDirty: dirty })
    if (selected) {
      form.setValue('categoryBg', selected.nameBg, { shouldDirty: dirty })
    }
  }

  useEffect(() => {
    if (!isNew) return
    if (form.getValues('categoryIds').length > 0) return
    const human = (categoriesQuery.data ?? []).find(
      (row) => row.slug === 'choveshki-istorii',
    )
    if (!human) return
    applyCategory(human.id, false)
  }, [categoriesQuery.data, form, isNew])

  const saveMutation = useMutation({
    mutationFn: async (raw: ArticleFormValues & { silent?: boolean }) => {
      const { silent, ...values } = raw
      const existingId =
        createdIdRef.current || (id && id !== 'new' ? id : null)
      if (!silent && !silentSave.current) setMediaSaving(true)
      try {
        const credit = values.photoCreditBg

        const idMap = new Map<string, string>()
        for (const item of gallery) {
          if (item.file) {
            const mediaId =
              uploadedGalleryRef.current.get(item.id) ??
              (
                await uploadCmsMedia(item.file, {
                  creditBg: credit,
                  showInGallery: values.section === 'events',
                })
              ).id
            uploadedGalleryRef.current.set(item.id, mediaId)
            idMap.set(item.id, mediaId)
          }
        }

        const mediaFields = mediaSaveFields(gallery, idMap)
        const { galleryMediaIds, videoUrl, videoMediaId } = mediaFields
        const heroMediaId = mediaFields.heroMediaId

        // Only send audio when the editor changed it, so a save never undoes
        // narration generated in the background (or restores removed audio).
        let audioMediaId: string | null | undefined
        if (pendingAudioFile) {
          const cached = uploadedAudioRef.current
          audioMediaId =
            cached?.file === pendingAudioFile
              ? cached.id
              : (await uploadCmsMedia(pendingAudioFile)).id
          uploadedAudioRef.current = { file: pendingAudioFile, id: audioMediaId }
        } else if (audioTouchedRef.current) {
          audioMediaId = values.audioMediaId || null
        }

        const minutes = Number(values.readTimeMinutes) || 1
        const sectionProfile = getSectionProfile(values.section)
        const durationSeconds =
          values.readTimeUnit === 'hours' ? minutes * 3600 : minutes * 60
        const body = stripEmptyBodyBlocks(
          compactBody(
            syncBodyImagesWithGallery(
              remapBodyMediaIds(values.body, idMap),
              gallery.map((item) => ({
                id: idMap.get(item.id) || item.id,
                url: item.url,
                kind: item.kind,
              })),
            ),
          ),
        )
        if (values.body.length !== body.length) {
          form.setValue('body', body as ArticleFormValues['body'], {
            shouldDirty: true,
          })
        }
        // Publish gates: empty blocks / gibberish still block. Translation readiness
        // never does — EN often lags (or briefly mirrors BG) while the job finishes,
        // and blocking publish/republish for that is worse than shipping BG first.
        if (values.status === 'PUBLISHED' && !silent) {
          const issues = validateStoryForPublish({
            titleBg: values.titleBg,
            titleEn: articleQuery.data?.title ?? null,
            subtitleBg: values.subtitleBg,
            subtitleEn: articleQuery.data?.subtitle ?? null,
            translationStatus: articleQuery.data?.translationStatus,
            body,
          }).filter((issue) => issue.code !== 'translation_not_ready')
          if (issues.length > 0) {
            throw new Error(
              issues
                .map((issue) => t(`cms.editor.publishIssue.${issue.code}`))
                .join(' '),
            )
          }
        }
        const payload = {
          section:
            values.section === 'featured' ? 'human-stories' : values.section,
          status: values.status,
          categoryBg: values.categoryBg,
          titleBg: values.titleBg,
          subtitleBg: values.subtitleBg,
          readTimeBg: formatReadTimeBg(minutes, values.readTimeUnit),
          locationBg: values.locationBg,
          dateBg: formatDateBg(
            values.dateIso || values.scheduledAt.slice(0, 10),
          ),
          publishedAt: publishedAtPayload(
            values.status,
            values.scheduledAt,
            values.dateIso,
          ),
          photoCreditBg: values.photoCreditBg,
          endLabelBg: values.endLabelBg,
          speakerBg: values.speakerBg || undefined,
          audioDuration: sectionProfile.showVideoSource
            ? formatWatchDuration(durationSeconds) || undefined
            : values.audioDuration || undefined,
          authorId: values.authorId || undefined,
          galleryMediaIds,
          heroMediaId: heroMediaId ?? '',
          ...(audioMediaId !== undefined ? { audioMediaId } : {}),
          videoUrl,
          videoMediaId,
          featured: values.featured || values.section === 'featured',
          sponsored: values.sponsored,
          sourced: values.sourced,
          sponsorName: values.sponsored
            ? values.sponsorName.trim() || null
            : null,
          behindStoryBg: values.behindStoryBg,
          seoTitleBg: values.seoTitleBg.trim() || null,
          seoDescriptionBg: values.seoDescriptionBg.trim() || null,
          tagIds: values.tagIds,
          categoryIds: values.categoryIds,
          body,
          seriesId:
            values.seriesMode === 'series' && values.seriesId
              ? values.seriesId
              : null,
        }
        if (existingId) return updateCmsArticle(existingId, payload)
        const created = await createCmsArticle(payload)
        createdIdRef.current = created.id
        return created
      } finally {
        setMediaSaving(false)
      }
    },
    onSuccess: async (article, variables) => {
      lastSavedSnapshot.current = serializeStoryDraft(variables)
      clearStoryDraft('new')
      clearStoryDraft(article.id)
      createdIdRef.current = article.id
      setSavedArticleId(article.id)

      const silent = Boolean(variables.silent) || silentSave.current
      if (silent) {
        queryClient.setQueryData(['cms-article', article.id], article)
        void queryClient.invalidateQueries({ queryKey: ['cms-articles'] })
        void queryClient.invalidateQueries({ queryKey: ['cms-articles-count'] })
        if (window.location.pathname.endsWith('/stories/new')) {
          window.history.replaceState(
            window.history.state,
            '',
            `${basePath}/${article.id}`,
          )
        }
        return
      }

      // Drop local blob previews; reload saved remote URLs from the article.
      for (const item of gallery) {
        revokeIfBlob(item.url)
        revokeIfBlob(item.posterUrl)
      }
      revokeIfBlob(audioUrl)
      revokeIfBlob(form.getValues('videoUrl'))
      setPendingAudioFile(null)
      queryClient.setQueryData(['cms-article', article.id], article)
      uploadedGalleryRef.current.clear()
      uploadedAudioRef.current = null
      setAudioTouched(false)
      setGallery(
        mergeBodyVideosIntoGallery(mergeLoadedMedia(article), article.bodyRaw),
      )
      setAudioUrl(article.audioUrl ?? '')
      form.setValue('videoUrl', article.videoUrl ?? '', { shouldDirty: false })
      form.setValue('videoMediaId', article.videoMediaId ?? '', {
        shouldDirty: false,
      })
      resetAudioField('audioMediaId', article.audioMediaId ?? '')
      resetAudioField('audioDuration', article.audioDuration ?? '')

      await queryClient.invalidateQueries({ queryKey: ['cms-articles'] })
      await queryClient.invalidateQueries({ queryKey: ['cms-articles-count'] })
      await queryClient.invalidateQueries({ queryKey: ['cms-series'] })
      await queryClient.invalidateQueries({ queryKey: ['public-articles'] })
      await queryClient.invalidateQueries({ queryKey: ['public-article'] })
      await queryClient.invalidateQueries({ queryKey: ['popular-stories'] })
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

  const deleteMutation = useMutation({
    mutationFn: () => deleteCmsArticle(id!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cms-articles'] })
      await queryClient.invalidateQueries({ queryKey: ['cms-articles-count'] })
      await queryClient.invalidateQueries({ queryKey: ['public-articles'] })
      await queryClient.invalidateQueries({ queryKey: ['public-articles-listing'] })
      await queryClient.invalidateQueries({ queryKey: ['public-media'] })
      navigate(basePath)
    },
  })

  const [sendBackOpen, setSendBackOpen] = useState(false)
  const [sendBackNote, setSendBackNote] = useState('')
  const sendBackMutation = useMutation({
    mutationFn: (note: string) => requestArticleChanges(articleId!, note),
    onSuccess: async (article) => {
      queryClient.setQueryData(['cms-article', article.id], article)
      form.resetField('status', { defaultValue: article.status })
      setSendBackOpen(false)
      setSendBackNote('')
      await queryClient.invalidateQueries({ queryKey: ['cms-articles'] })
      await queryClient.invalidateQueries({ queryKey: ['cms-articles-count'] })
      await queryClient.invalidateQueries({ queryKey: ['cms-dashboard-checklist'] })
    },
  })

  const confirmDelete = async () => {
    const title =
      pickLang(lang, articleQuery.data?.title, form.getValues('titleBg')) ||
      t('cms.editor.untitled')
    const ok = await confirm({
      title: t('cms.stories.delete'),
      description: t('cms.stories.deleteConfirm', { title }),
    })
    if (!ok) return
    deleteMutation.mutate()
  }

  const createAuthorMutation = useMutation({
    mutationFn: (nameBg: string) =>
      createCmsAuthor(nameBg, { isGuest: newAuthorGuest }),
    onSuccess: async (author) => {
      await queryClient.invalidateQueries({ queryKey: ['cms-authors'] })
      form.setValue('authorId', author.id, { shouldDirty: true })
      setNewAuthorName('')
      setNewAuthorGuest(false)
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
    form.setValue('galleryMediaIds', form.getValues('galleryMediaIds'), {
      shouldDirty: true,
    })
  }

  const applyGallery = (
    next: GalleryItem[],
    body = form.getValues('body'),
    active?: number,
  ) => {
    setGallery(next)
    if (typeof active === 'number') setActiveSlide(active)
    replace(syncBodyImagesWithGallery(body, next))
    noteGalleryEdit()
  }

  /** Local preview only — MinIO upload happens on Save/Publish. */
  const pickImages = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return
    setMediaPreparing(true)
    try {
      const list = Array.from(files).filter((file) => {
        try {
          assertCmsFileSize(file)
          return true
        } catch {
          return false
        }
      })
      if (list.length === 0) return
      const items: GalleryItem[] = list.map((file) => ({
        id: `local-${randomId()}`,
        url: URL.createObjectURL(file),
        file,
        kind: 'image',
      }))
      await Promise.all(items.map((item) => preloadImageUrl(item.url)))
      const startIndex = gallery.length
      applyGallery([...gallery, ...items], form.getValues('body'), startIndex)
      setMediaTab('image')
    } finally {
      setMediaPreparing(false)
    }
  }

  const imageDrop = useImageFileDrop({
    disabled: mediaSaving || mediaPreparing || posterBusy,
    onImages: pickImages,
  })

  const applyPastedParagraphs = (index: number, pasted: string) => {
    const chunks = splitPastedParagraphs(pasted)
    if (chunks.length <= 1) return false
    form.setValue(`body.${index}.textBg`, chunks[0]!, { shouldDirty: true })
    for (let i = 1; i < chunks.length; i += 1) {
      insert(index + i, { type: 'paragraph', textBg: chunks[i]! })
    }
    return true
  }

  const pickInlineImages = async (files: File[], afterIndex: number) => {
    if (files.length === 0) return
    setMediaPreparing(true)
    try {
      const items: GalleryItem[] = []
      for (const file of files) {
        const url = URL.createObjectURL(file)
        await preloadImageUrl(url)
        items.push({ id: `local-${randomId()}`, url, file, kind: 'image' })
      }
      const nextGallery = [...gallery, ...items]
      const heroId = nextGallery[0]?.id
      const extras = items.filter((item) => item.id !== heroId)
      const body = [...form.getValues('body')]
      let insertAt = afterIndex + 1
      for (const item of extras) {
        body.splice(insertAt, 0, {
          type: 'image',
          mediaId: item.id,
          url: item.url,
          captionBg: '',
        })
        insertAt += 1
      }
      applyGallery(nextGallery, body)
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
            kind: 'image',
          },
        ]
      })
      noteGalleryEdit()
    } finally {
      setMediaPreparing(false)
    }
  }

  const pickVideoFile = async (file: File) => {
    try {
      assertCmsFileSize(file)
    } catch {
      return
    }
    setMediaPreparing(true)
    setPosterBusy(true)
    setMediaTab('video')
    try {
      const localUrl = URL.createObjectURL(file)
      const item: GalleryItem = {
        id: `local-${randomId()}`,
        kind: 'video',
        url: localUrl,
        file,
      }
      try {
        const captured = await captureVideoPosterBlob(file)
        item.posterUrl = URL.createObjectURL(captured.blob)
        if (captured.durationSec > 0 && profile.showVideoSource) {
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
        /* video preview still works without auto poster */
      }
      form.setValue('videoUrl', '', { shouldDirty: true })
      form.setValue('videoMediaId', '', { shouldDirty: true })
      const startIndex = gallery.length
      applyGallery([...gallery, item], form.getValues('body'), startIndex)
    } finally {
      setPosterBusy(false)
      setMediaPreparing(false)
    }
  }

  const addVideoLink = (rawUrl?: string) => {
    const url = (rawUrl ?? form.getValues('videoUrl')).trim()
    const playback = resolveVideoPlayback(url)
    if (playback?.kind !== 'youtube' && playback?.kind !== 'vimeo') return
    setMediaTab('video')
    const item: GalleryItem = {
      id: embedVideoMediaId(url),
      kind: 'video',
      url: playback.watchUrl,
      posterUrl: getRemotePosterUrl(url) || undefined,
    }
    form.setValue('videoUrl', item.url, { shouldDirty: true })
    form.setValue('videoMediaId', '', { shouldDirty: true })
    const existing = gallery.findIndex((entry) => isEmbedVideoItem(entry))
    if (existing >= 0) {
      const doomed = gallery[existing]
      if (doomed?.url !== item.url) revokeIfBlob(doomed?.url)
      const next = [...gallery]
      next[existing] = item
      applyGallery(next, form.getValues('body'), existing)
      return
    }
    applyGallery([...gallery, item], form.getValues('body'), gallery.length)
  }

  /** Local preview only — upload happens on Save. Returns an error message when rejected. */
  const pickAudioFile = async (file: File): Promise<string | null> => {
    if (file.type && !file.type.startsWith('audio/')) {
      return t('cms.editor.audioNotAudio')
    }
    try {
      assertCmsFileSize(file)
    } catch (error) {
      return error instanceof Error ? error.message : String(error)
    }
    setMediaPreparing(true)
    try {
      revokeIfBlob(audioUrl)
      const localUrl = URL.createObjectURL(file)
      setPendingAudioFile(file)
      setAudioTouched(true)
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
        window.setTimeout(resolve, 3000)
        el.src = localUrl
      })
      return null
    } finally {
      setMediaPreparing(false)
    }
  }

  const activeMedia = gallery[activeSlide]
  const activePlayback =
    activeMedia?.kind === 'video'
      ? resolveVideoPlayback(activeMedia.url)
      : null

  useEffect(() => {
    if (gallery.length === 0) {
      setActiveSlide(0)
      return
    }
    setActiveSlide((prev) => Math.min(prev, gallery.length - 1))
  }, [gallery.length])

  const removeImage = (mediaId: string) => {
    const doomed = gallery.find((item) => item.id === mediaId)
    revokeIfBlob(doomed?.url)
    revokeIfBlob(doomed?.posterUrl)
    const next = gallery.filter((item) => item.id !== mediaId)
    if (doomed?.kind === 'video' && !next.some((item) => item.kind === 'video')) {
      form.setValue('videoUrl', '', { shouldDirty: true })
      form.setValue('videoMediaId', '', { shouldDirty: true })
    }
    applyGallery(next)
  }

  const dropMediaIdsFromBody = (mediaIds: string[]) => {
    if (mediaIds.length === 0) return
    const next = dropGalleryMedia(gallery, mediaIds)
    if (next.length === gallery.length) return
    for (const item of gallery) {
      if (!mediaIds.includes(item.id)) continue
      revokeIfBlob(item.url)
      revokeIfBlob(item.posterUrl)
    }
    if (
      gallery.some((item) => item.kind === 'video' && mediaIds.includes(item.id)) &&
      !next.some((item) => item.kind === 'video')
    ) {
      form.setValue('videoUrl', '', { shouldDirty: true })
      form.setValue('videoMediaId', '', { shouldDirty: true })
    }
    applyGallery(next)
  }

  const selectMedia = (index: number) => {
    setActiveSlide(index)
    const item = gallery[index]
    if (item?.kind === 'video') {
      setMediaTab('video')
      if (isEmbedVideoItem(item)) {
        form.setValue('videoUrl', item.url, { shouldDirty: false })
      }
    } else {
      setMediaTab('image')
    }
  }

  const selectAudioFile = async (file: File) => {
    setAudioError(await pickAudioFile(file))
  }

  const watchedAudioMediaId = form.watch('audioMediaId')
  const audioChange: AudioChange = pendingAudioFile
    ? 'added'
    : audioTouched && !watchedAudioMediaId
      ? 'removed'
      : 'none'

  /** Back to the saved audio (drops a pending upload or a pending removal). */
  const undoAudioChange = () => {
    setAudioError(null)
    revokeIfBlob(audioUrl)
    setPendingAudioFile(null)
    setAudioTouched(false)
    resetAudioField('audioMediaId', serverAudioId)
    resetAudioField('audioDuration')
    setAudioUrl(serverAudioUrl)
  }

  /** Removal is applied on Save/Update, so it can still be undone. */
  const clearAudio = () => {
    if (!serverAudioId) {
      undoAudioChange()
      return
    }
    setAudioError(null)
    revokeIfBlob(audioUrl)
    setPendingAudioFile(null)
    setAudioTouched(true)
    setAudioUrl('')
    form.setValue('audioMediaId', '', { shouldDirty: true })
    form.setValue('audioDuration', '', { shouldDirty: true })
  }

  const setAsHero = (mediaId: string) => {
    const index = gallery.findIndex((item) => item.id === mediaId)
    if (index <= 0) return
    applyGallery(arrayMove(gallery, index, 0), form.getValues('body'), 0)
  }

  const reorderGallery = (from: number, to: number) => {
    if (from === to) return
    applyGallery(arrayMove(gallery, from, to), form.getValues('body'), to)
  }

  const goPrev = () => {
    const next = activeSlide <= 0 ? gallery.length - 1 : activeSlide - 1
    selectMedia(next)
  }

  const goNext = () => {
    const next = activeSlide >= gallery.length - 1 ? 0 : activeSlide + 1
    selectMedia(next)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (savingLock.current) return
    savingLock.current = true
    setSavingAction((values.status as EditorSaveAction) || 'DRAFT')
    try {
      await saveMutation.mutateAsync(values)
    } finally {
      savingLock.current = false
      setSavingAction(null)
    }
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
    if (saveMutation.isPending || savingLock.current) {
      queuedStatus.current = statusToSave
      setSavingAction(statusToSave)
      return
    }

    const runSave = (status: EditorSaveAction) => {
      savingLock.current = true
      setSavingAction(status)
      void form.handleSubmit(
        async (values) => {
          try {
            await saveMutation.mutateAsync({
              ...values,
              status,
            })
          } catch {
            // Error is surfaced via saveMutation.isError in the footer.
          } finally {
            savingLock.current = false
            setSavingAction(null)
            const queued = queuedStatus.current
            queuedStatus.current = null
            if (queued) submitStatusRef.current(queued)
          }
        },
        () => {
          savingLock.current = false
          setSavingAction(null)
        },
      )()
    }

    const alreadyLive = !isNew && articleQuery.data?.status === 'PUBLISHED'

    if (statusToSave === 'DRAFT' && alreadyLive) {
      void (async () => {
        const ok = await confirm({
          title: t('cms.editor.unpublishConfirmTitle'),
          description: t('cms.editor.unpublishConfirmBody'),
          confirmLabel: t('cms.editor.unpublish'),
        })
        if (ok) runSave('DRAFT')
      })()
      return
    }

    if (statusToSave === 'PUBLISHED' && !alreadyLive) {
      void (async () => {
        const ok = await confirm({
          title: t('cms.editor.publishConfirmTitle'),
          description: t('cms.editor.publishConfirmBody'),
          confirmLabel: t('cms.editor.publish'),
          cancelLabel: t('cms.editor.cancel'),
          variant: 'default',
        })
        if (ok) runSave('PUBLISHED')
      })()
      return
    }

    runSave(statusToSave)
  }
  submitStatusRef.current = submitStatus

  const persistSilentDraft = async () => {
    if (savingLock.current || saveMutation.isPending || editorBusyRef.current) {
      return
    }
    const values = form.getValues()
    if (
      !shouldAutosaveDraft({
        dirty: true,
        title: values.titleBg,
        status: values.status,
        busy: false,
      })
    ) {
      return
    }
    const snapshot = serializeStoryDraft(values)
    if (snapshot === lastSavedSnapshot.current) return
    savingLock.current = true
    silentSave.current = true
    setAutosaveState('saving')
    try {
      await saveMutation.mutateAsync({
        ...values,
        status: autosaveStatus(values.status),
        silent: true,
      })
      setAutosaveState('saved')
    } catch {
      writeStoryDraft(isNew ? 'new' : id!, values)
      setAutosaveState('error')
    } finally {
      silentSave.current = false
      savingLock.current = false
      const queued = queuedStatus.current
      queuedStatus.current = null
      if (queued) submitStatusRef.current(queued)
      else if (
        serializeStoryDraft(form.getValues()) !== lastSavedSnapshot.current
      ) {
        scheduleAutosaveRef.current()
      }
    }
  }
  persistSilentDraftRef.current = persistSilentDraft

  scheduleAutosaveRef.current = () => {
    window.clearTimeout(autosaveTimerRef.current)
    const values = form.getValues()
    if (
      !shouldAutosaveDraft({
        dirty: true,
        title: values.titleBg,
        status: values.status,
        busy: editorBusyRef.current || savingLock.current,
      })
    ) {
      return
    }
    autosaveTimerRef.current = window.setTimeout(() => {
      void persistSilentDraftRef.current()
    }, AUTOSAVE_IDLE_MS)
  }

  const draftKey = isNew ? 'new' : id!

  useEffect(() => {
    if (restoredDraft.current) return
    if (!isNew && !articleQuery.data) return
    const backup = readStoryDraft(draftKey)
    if (
      !shouldRestoreStoryDraft(
        backup,
        isNew ? null : articleQuery.data?.updatedAt,
      )
    ) {
      restoredDraft.current = true
      lastSavedSnapshot.current = serializeStoryDraft(form.getValues())
      return
    }
    const next = backup!.values
    form.setValue('titleBg', next.titleBg, { shouldDirty: true })
    form.setValue('subtitleBg', next.subtitleBg, { shouldDirty: true })
    form.setValue('body', next.body, { shouldDirty: true })
    form.setValue('locationBg', next.locationBg, { shouldDirty: true })
    form.setValue('behindStoryBg', next.behindStoryBg, { shouldDirty: true })
    form.setValue('seoTitleBg', next.seoTitleBg, { shouldDirty: true })
    form.setValue('seoDescriptionBg', next.seoDescriptionBg, { shouldDirty: true })
    restoredDraft.current = true
  }, [articleQuery.data, draftKey, form, isNew])

  useEffect(() => {
    const sub = form.watch((_values, info) => {
      if (info.type && info.type !== 'change') return
      if (
        info.name === 'galleryMediaIds' ||
        info.name === 'readTimeMinutes' ||
        info.name === 'readTimeUnit'
      ) {
        return
      }
      if (editorDirtyRef.current) {
        window.clearTimeout(localBackupTimerRef.current)
        localBackupTimerRef.current = window.setTimeout(() => {
          writeStoryDraft(draftKey, form.getValues())
        }, 400)
      }
      scheduleAutosaveRef.current()
    })
    return () => {
      sub.unsubscribe()
      window.clearTimeout(localBackupTimerRef.current)
      window.clearTimeout(autosaveTimerRef.current)
    }
  }, [draftKey, form])

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!editorDirty) return
      writeStoryDraft(draftKey, form.getValues())
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [draftKey, editorDirty, form])

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

  const categoryIds = form.watch('categoryIds')
  const categoryOptions = categorySelectOptions(
    categoriesQuery.data ?? [],
    lang,
  )
  const selectedCategoryId = primaryCategoryId(
    categoryIds,
    categoriesQuery.data ?? [],
  )
  const statusOptions = (
    canPublish
      ? (['DRAFT', 'REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'] as const)
      : (['DRAFT', 'REVIEW'] as const)
  ).map((status) => ({
    value: status,
    label: t(`cms.status.${status.toLowerCase()}`),
  }))

  const authorOptions = (authorsQuery.data ?? []).map((author) => {
    const name = pickLang(lang, author.nameEn ?? author.nameBg, author.nameBg)
    return {
      value: author.id,
      label: author.isGuest ? `${name} · ${t('cms.authors.guestBadge')}` : name,
    }
  })
  const selectedAuthorLabel =
    authorOptions.find((option) => option.value === form.watch('authorId'))
      ?.label ?? ''

  const savedStatus = articleQuery.data?.status
  const isLive = !isNew && savedStatus === 'PUBLISHED'
  /** Writers without publishing rights only move a story between draft and review. */
  const writerStage =
    isNew || savedStatus === undefined || savedStatus === 'DRAFT' || savedStatus === 'REVIEW'
  const showWriterActions = canPublish || writerStage
  /** Live/scheduled/archived: authors can't change it; SEO editors may update content in place. */
  const showThirdAction = canPublish || (!writerStage && canPickAuthor)
  const canSendBack = canPublish && !isNew && savedStatus === 'REVIEW'
  const reviewNote =
    savedStatus === 'DRAFT' ? articleQuery.data?.reviewNote?.trim() || '' : ''
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
          {isLive && editorDirty ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
              {t('cms.editor.liveEditsPending')}
            </span>
          ) : null}
          {articleQuery.data?.translationStatus && (
            <StatusPill status={articleQuery.data.translationStatus} />
          )}
          {autosaveState === 'saving' ? (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
              {t('cms.editor.autosaveSaving')}
            </span>
          ) : autosaveState === 'saved' ? (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
              {t('cms.editor.autosaveSaved')}
            </span>
          ) : autosaveState === 'error' ? (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-700">
              {t('cms.editor.autosaveFailed')}
            </span>
          ) : null}
          {!isNew && canDeleteStory ? (
            <GhostButton
              type="button"
              className="text-rose-700 hover:border-rose-200 hover:bg-rose-50"
              disabled={deleteMutation.isPending || editorBusy}
              onClick={() => void confirmDelete()}
            >
              <Trash2 className="size-4" />
              {deleteMutation.isPending
                ? t('cms.stories.deleting')
                : t('cms.stories.delete')}
            </GhostButton>
          ) : null}
          {canSendBack ? (
            <GhostButton
              type="button"
              disabled={editorDirty || editorBusy || sendBackMutation.isPending}
              title={editorDirty ? t('cms.editor.sendBackSaveFirst') : undefined}
              onClick={() => setSendBackOpen(true)}
            >
              <Undo2 className="size-4" />
              {t('cms.editor.sendBack')}
            </GhostButton>
          ) : null}
          {showWriterActions ? (
          <>
          <EditorActionButton
            type="button"
            primary={status === 'REVIEW'}
            onClick={() => submitStatus('REVIEW')}
            disabled={actionDisabled('REVIEW')}
            aria-busy={savingAction === 'REVIEW'}
          >
            {savingAction === 'REVIEW' ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t('cms.editor.saving')}
              </>
            ) : canPublish ? (
              t('cms.editor.review')
            ) : (
              t('cms.editor.submitForReview')
            )}
          </EditorActionButton>
          <EditorActionButton
            type="button"
            primary={status === 'DRAFT'}
            onClick={() => submitStatus('DRAFT')}
            disabled={actionDisabled('DRAFT')}
            aria-busy={savingAction === 'DRAFT'}
          >
            {savingAction === 'DRAFT' ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t('cms.editor.saving')}
              </>
            ) : (
              <>
                <Save className="size-4" />{' '}
                {isLive ? t('cms.editor.unpublish') : t('cms.editor.saveDraft')}
              </>
            )}
          </EditorActionButton>
          </>
          ) : null}
          {showThirdAction ? (
          <EditorActionButton
            type="button"
            primary={status === thirdAction}
            onClick={() => submitStatus(thirdAction)}
            disabled={actionDisabled(thirdAction)}
            aria-busy={savingAction === thirdAction}
          >
            {savingAction === thirdAction ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {thirdAction === 'PUBLISHED'
                  ? t('cms.editor.publishingNow')
                  : t('cms.editor.saving')}
              </>
            ) : thirdAction === 'SCHEDULED' ? (
              <>
                <Clock className="size-4" /> {t('cms.editor.schedule')}
              </>
            ) : thirdAction === 'ARCHIVED' ? (
              t('cms.editor.archive')
            ) : isLive ? (
              t('cms.editor.update')
            ) : (
              t('cms.editor.publish')
            )}
          </EditorActionButton>
          ) : null}
        </div>
        {!canPublish && writerStage && !reviewNote ? (
          <p className="w-full text-xs text-stone-500">
            {t('cms.editor.reviewHint')}
          </p>
        ) : null}
        {reviewNote ? (
          <div
            role="status"
            className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">
              {canPublish
                ? t('cms.editor.sentBackTitle')
                : t('cms.editor.changesRequestedTitle')}
            </p>
            <p className="mt-1 whitespace-pre-line">{reviewNote}</p>
            {!canPublish ? (
              <p className="mt-2 text-xs text-amber-800">
                {t('cms.editor.changesRequestedHint')}
              </p>
            ) : null}
          </div>
        ) : null}
        {saveMutation.isError ||
        (form.formState.isSubmitted && Object.keys(errors).length > 0) ? (
          <p
            role="alert"
            className="w-full rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
          >
            {saveMutation.isError
              ? (saveMutation.error as ApiError)?.message ||
                t('cms.editor.saveFailed')
              : t('cms.editor.validationFailed')}
          </p>
        ) : null}
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
        onInput={() => scheduleAutosaveRef.current()}
        onKeyUp={() => scheduleAutosaveRef.current()}
        className="grid grid-cols-1 gap-8 overflow-x-hidden xl:grid-cols-[minmax(0,1fr)_320px]"
      >
        <div className="min-w-0 space-y-6 overflow-x-hidden">
          <CmsCard className="space-y-3 p-5">
            <h2 className="text-sm font-semibold text-stone-800">
              {t('cms.editor.sectionHint')}
            </h2>
            <JournalSelect
              name="category"
              variant="boxed"
              label={t('cms.editor.category')}
              placeholder={t('cms.editor.category')}
              options={categoryOptions}
              value={selectedCategoryId}
              onChange={(value) => applyCategory(value)}
            />
            <p className="text-xs text-stone-500">
              {t('cms.editor.description')}
            </p>
          </CmsCard>

          {profile.showSpeakerAudio ? (
            <CmsCard className="space-y-5 p-6">
              <div>
                <h2 className="font-heading text-lg font-semibold">
                  {t('cms.editor.audioMedia')}
                </h2>
                <p className="mt-1 text-xs text-stone-500">
                  {t('cms.editor.audioSourceHint')}
                </p>
              </div>

              {audioChange === 'removed' ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-medium text-amber-900">
                    {t('cms.editor.narrationRemovePending')}
                  </p>
                  <GhostButton
                    type="button"
                    className="py-1.5 text-xs"
                    onClick={undoAudioChange}
                  >
                    {t('cms.editor.narrationUndo')}
                  </GhostButton>
                </div>
              ) : null}
              {audioError ? (
                <p className="text-xs text-rose-700">{audioError}</p>
              ) : null}

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
                      await selectAudioFile(file)
                      e.target.value = ''
                    }}
                  />
                </label>
              ) : (
                <div className="relative space-y-4">
                  <MediaPrepOverlay />
                  <div className="rounded-2xl border border-[#E8E4DC] bg-[#FAF8F3] p-4">
                    <p className="mb-3 text-xs font-semibold text-stone-700">
                      {audioChange === 'added'
                        ? t('cms.editor.narrationSourceNew')
                        : t('cms.editor.audioReady')}
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
                          await selectAudioFile(file)
                          e.target.value = ''
                        }}
                      />
                    </label>
                    <GhostButton
                      type="button"
                      className="py-2 text-xs"
                      onClick={() =>
                        audioChange === 'added' ? undoAudioChange() : clearAudio()
                      }
                    >
                      {audioChange === 'added'
                        ? t('cms.editor.narrationUndo')
                        : t('cms.editor.clearAudio')}
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
          ) : null}

          <div
            className="relative space-y-6"
            data-testid="story-media-dropzone"
            {...imageDrop.props}
          >
            {imageDrop.active ? (
              <div className="pointer-events-none absolute inset-0 z-30 flex items-start justify-center rounded-2xl border-2 border-dashed border-[#0C2686] bg-[#0C2686]/10 pt-10">
                <p className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0C2686] shadow-md">
                  {gallery.length === 0
                    ? t('cms.editor.dropImagesHero')
                    : t('cms.editor.dropImagesAdd')}
                </p>
              </div>
            ) : null}
          <CmsCard className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 rounded-xl border border-[#E8E4DC] bg-[#FAF8F3] p-1">
                <button
                  type="button"
                  data-testid="media-tab-images"
                  onClick={() => setMediaTab('image')}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                    mediaTab === 'image'
                      ? 'bg-white text-[#0C2686] shadow-sm'
                      : 'text-stone-500 hover:text-stone-700',
                  )}
                >
                  {t('cms.editor.gallery')}
                </button>
                <button
                  type="button"
                  data-testid="media-tab-video"
                  onClick={() => setMediaTab('video')}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                    mediaTab === 'video'
                      ? 'bg-white text-[#0C2686] shadow-sm'
                      : 'text-stone-500 hover:text-stone-700',
                  )}
                >
                  {t('cms.editor.videoMedia')}
                </button>
              </div>
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
                {mediaTab === 'image' ? (
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#E8E4DC] bg-white px-4 py-2.5 text-xs font-semibold text-[#0C2686] shadow-2xs">
                    <ImagePlus className="size-4" />
                    {mediaBusy
                      ? t('cms.editor.preparingMedia')
                      : t('cms.editor.addImages')}
                    <span className="font-normal text-stone-400">
                      {t('cms.editor.imageMaxSize')}
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
                ) : (
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#E8E4DC] bg-white px-4 py-2.5 text-xs font-semibold text-[#0C2686] shadow-2xs">
                    <Film className="size-4" />
                    {mediaBusy
                      ? t('cms.editor.preparingMedia')
                      : t('cms.editor.addVideo')}
                    <span className="font-normal text-stone-400">
                      {t('cms.editor.videoMaxSize')}
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
                )}
              </div>
            </div>
            <p className="text-[11px] text-stone-500">
              {t('cms.editor.galleryHeroHint')}
            </p>

            {mediaTab === 'video' && (
              <div className="space-y-2">
                <label className="block space-y-1.5 text-xs font-medium text-stone-600">
                  <span>{t('cms.editor.videoUrl')}</span>
                  <div className="flex gap-2">
                    <input
                      className="w-full rounded-lg border border-[#E8E4DC] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0C2686]"
                      placeholder="https://www.youtube.com/watch?v=…"
                      {...form.register('videoUrl', {
                        onBlur: () => addVideoLink(),
                      })}
                    />
                    <GhostButton
                      type="button"
                      className="shrink-0 py-2 text-xs"
                      onClick={() => addVideoLink()}
                    >
                      {t('cms.editor.videoPreview')}
                    </GhostButton>
                  </div>
                </label>
              </div>
            )}

            {gallery.length === 0 ? (
              mediaTab === 'image' ? (
                <label className="relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#E8E4DC] bg-[#FAF8F3] px-6 py-16 text-center transition-colors hover:border-[#0C2686]/40">
                  <MediaPrepOverlay />
                  <ImagePlus className="size-8 text-[#0C2686]" />
                  <span className="text-sm font-medium text-stone-600">
                    {mediaBusy
                      ? t('cms.editor.preparingMedia')
                      : t('cms.editor.dropImages')}
                  </span>
                  <span className="text-[11px] text-stone-400">
                    {t('cms.editor.dropImagesHero')}
                  </span>
                  <span className="text-[11px] text-stone-400">
                    {t('cms.editor.imageMaxSize')}
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
              ) : (
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
                  <span className="text-[11px] text-stone-400">
                    {t('cms.editor.videoMaxSize')}
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
              )
            ) : galleryView === 'slider' ? (
              <div className="relative max-w-full space-y-3 overflow-x-hidden">
                <MediaPrepOverlay />
                <div className={cn(
                  'relative h-[min(14rem,32vh)] w-full overflow-hidden rounded-2xl border bg-stone-100',
                  activeSlide === 0
                    ? 'border-[#0C2686] ring-2 ring-[#0C2686]/30'
                    : 'border-[#E8E4DC]',
                )}>
                  {activeMedia?.kind === 'video' &&
                  (activePlayback?.kind === 'youtube' ||
                    activePlayback?.kind === 'vimeo') ? (
                    <iframe
                      src={activePlayback.embedUrl.replace(
                        'autoplay=1',
                        'autoplay=0',
                      )}
                      title={t('cms.editor.videoPreview')}
                      className="absolute inset-0 h-full w-full bg-black"
                      allow="encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  ) : activeMedia?.kind === 'video' ? (
                    <video
                      key={activeMedia.url}
                      src={activeMedia.url}
                      controls
                      playsInline
                      preload="metadata"
                      poster={mediaThumbUrl(activeMedia)}
                      className="absolute inset-0 h-full w-full bg-black object-contain"
                    />
                  ) : (
                    <img
                      src={activeMedia?.url}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  {activeSlide === 0 && (
                    <span className="absolute left-3 top-3 rounded-md bg-[#0C2686] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                      {t('cms.editor.heroLabel')}
                    </span>
                  )}
                  <div className="absolute right-3 top-3 flex gap-2">
                    {activeSlide !== 0 && activeMedia && (
                      <button
                        type="button"
                        onClick={() => setAsHero(activeMedia.id)}
                        className="rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-[#0C2686] shadow-sm"
                      >
                        {t('cms.editor.setAsHero')}
                      </button>
                    )}
                    {activeMedia && (
                      <button
                        type="button"
                        onClick={() => removeImage(activeMedia.id)}
                        className="rounded-lg bg-white/95 p-1.5 text-stone-600 shadow-sm"
                        title={t('cms.editor.removeImage')}
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
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
                  <div className="max-w-full overflow-x-auto overflow-y-hidden pb-1 pt-1">
                    <StoryGalleryThumbs
                      items={gallery.map((item) => ({
                        ...item,
                        posterUrl: mediaThumbUrl(item),
                      }))}
                      layout="strip"
                      activeId={gallery[activeSlide]?.id}
                      heroLabel={t('cms.editor.heroLabel')}
                      newLabel={t('cms.editor.newImage')}
                      removeLabel={t('cms.editor.removeImage')}
                      dragLabel={t('cms.editor.dragGallery')}
                      onReorder={reorderGallery}
                      onSelect={selectMedia}
                      onRemove={removeImage}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <MediaPrepOverlay />
                <StoryGalleryThumbs
                  items={gallery.map((item) => ({
                    ...item,
                    posterUrl: mediaThumbUrl(item),
                  }))}
                  layout="grid"
                  activeId={gallery[activeSlide]?.id}
                  heroLabel={t('cms.editor.heroLabel')}
                  newLabel={t('cms.editor.newImage')}
                  removeLabel={t('cms.editor.removeImage')}
                  dragLabel={t('cms.editor.dragGallery')}
                  onReorder={reorderGallery}
                  onSelect={(index) => {
                    selectMedia(index)
                    setGalleryView('slider')
                  }}
                  onRemove={removeImage}
                />
              </div>
            )}
          </CmsCard>

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
                <div className="border border-[#E8E4DC] bg-[#FAF8F3] px-3 py-2">
                  <StoryRichTextField
                    index={0}
                    splitOnEnter={false}
                    value={
                      form.watch('body.0.type') === 'paragraph'
                        ? form.watch('body.0.textBg')
                        : ''
                    }
                    placeholder={t('cms.editor.writePlaceholder')}
                    onChange={(html) => {
                      if (form.getValues('body.0.type') !== 'paragraph') {
                        replace(
                          ensureTeaserParagraph(form.getValues('body')).map(
                            (block, i) =>
                              i === 0
                                ? { type: 'paragraph' as const, textBg: html }
                                : block,
                          ),
                        )
                        return
                      }
                      form.setValue('body.0.textBg', html, { shouldDirty: true })
                    }}
                    onFocus={() => undefined}
                    onPasteChunks={(chunks) => {
                      applyPastedParagraphs(0, chunks.join('\n\n'))
                    }}
                  />
                </div>
                <span className="block text-[11px] text-stone-500">
                  {t('cms.editor.teaserHint')}
                </span>
              </label>
            )}
          </CmsCard>

          <CmsCard className="space-y-4 p-6">
            <h2 className="font-heading text-lg font-semibold">
              {t('cms.editor.bodyBlocks')}
            </h2>
            <StoryBodyEditor
              form={form}
              fields={fields}
              hideFirstParagraph={Boolean(profile.showTeaser)}
              gallery={gallery}
              insert={insert}
              update={update}
              remove={remove}
              onDropMediaIds={dropMediaIdsFromBody}
              move={move}
              onAddImages={pickInlineImages}
              replaceBody={replace}
            />
          </CmsCard>
          </div>
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
            bodyText={draftPlainTextForAi(form.watch('body'))}
            locationBg={form.watch('locationBg')}
            categoryBg={form.watch('categoryBg')}
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

          <NarrationPanel
            articleId={articleId}
            article={articleQuery.data}
            audioUrl={audioUrl || undefined}
            audioChange={audioChange}
            textUnsaved={editorDirty}
            allowUpload={!profile.showSpeakerAudio}
            preparing={mediaPreparing}
            error={audioError}
            onUpload={selectAudioFile}
            onRemove={clearAudio}
            onUndo={undoAudioChange}
            hasText={Boolean(
              form.watch('titleBg')?.trim() ||
                form
                  .watch('body')
                  ?.some(
                    (block) =>
                      (block.type === 'paragraph' ||
                        block.type === 'pullquote' ||
                        block.type === 'note') &&
                      Boolean(
                        ('textBg' in block && block.textBg?.trim()) ||
                          ('labelBg' in block && block.labelBg?.trim()),
                      ),
                  ),
            )}
          />

          <CmsCard className="space-y-4 p-5">
            <h3 className="text-sm font-semibold">{t('cms.editor.publishing')}</h3>
            {canPublish || writerStage ? (
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
            ) : (
              <p className="text-xs text-stone-500">
                {t('cms.editor.statusModeratorOnly')}
              </p>
            )}
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
              description={t('cms.editor.featuredHint')}
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
                  {...form.register('readTimeMinutes', {
                    onChange: () => setReadTimeManual(true),
                  })}
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
                    onChange={(value) => {
                      setReadTimeManual(true)
                      form.setValue(
                        'readTimeUnit',
                        value as 'minutes' | 'hours',
                        { shouldDirty: true },
                      )
                    }}
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
                {!profile.showVideoSource ? (
                  <>
                    {' '}
                    · {t('cms.editor.readTimeHint')}
                    {readTimeManual && estimatedMinutes !==
                    Number(form.watch('readTimeMinutes')) ? (
                      <>
                        {' '}
                        <button
                          type="button"
                          className="text-[#0C2686] underline-offset-2 hover:underline"
                          onClick={() => {
                            setReadTimeManual(false)
                            form.setValue('readTimeMinutes', estimatedMinutes, {
                              shouldDirty: true,
                            })
                            form.setValue('readTimeUnit', 'minutes', {
                              shouldDirty: true,
                            })
                          }}
                        >
                          {t('cms.editor.readTimeApply', {
                            n: estimatedMinutes,
                          })}
                        </button>
                      </>
                    ) : null}
                  </>
                ) : null}
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
            {canPickAuthor ? (
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
            ) : (
              <div className="space-y-1 text-sm">
                {selectedAuthorLabel ? (
                  <p className="font-medium">{selectedAuthorLabel}</p>
                ) : null}
                <p className="text-xs text-stone-500">
                  {t('cms.editor.authorOwnOnly')}
                </p>
              </div>
            )}
            {!canCreateAuthor ? null : !showAuthorForm ? (
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
                <label className="flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={newAuthorGuest}
                    onChange={(e) => setNewAuthorGuest(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-semibold">
                      {t('cms.authors.guestLabel')}
                    </span>
                    <span className="block text-stone-500">
                      {t('cms.authors.guestHint')}
                    </span>
                  </span>
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
                      setNewAuthorGuest(false)
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
      {dialog}
      <CmsModal
        open={sendBackOpen}
        onClose={() => {
          if (!sendBackMutation.isPending) setSendBackOpen(false)
        }}
        title={t('cms.editor.sendBackTitle')}
        description={t('cms.editor.sendBackDescription')}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            const note = sendBackNote.trim()
            if (note) sendBackMutation.mutate(note)
          }}
        >
          <CmsField label={t('cms.editor.sendBackNote')} htmlFor="send-back-note">
            <CmsTextarea
              id="send-back-note"
              rows={5}
              maxLength={4000}
              required
              autoFocus
              value={sendBackNote}
              onChange={(event) => setSendBackNote(event.target.value)}
              placeholder={t('cms.editor.sendBackPlaceholder')}
            />
          </CmsField>
          {sendBackMutation.isError ? (
            <p role="alert" className="text-sm text-rose-700">
              {(sendBackMutation.error as ApiError)?.message ||
                t('cms.editor.sendBackFailed')}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <GhostButton
              type="button"
              disabled={sendBackMutation.isPending}
              onClick={() => setSendBackOpen(false)}
            >
              {t('cms.editor.cancel')}
            </GhostButton>
            <PrimaryButton
              type="submit"
              disabled={!sendBackNote.trim() || sendBackMutation.isPending}
            >
              {sendBackMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Undo2 className="size-4" />
              )}
              {t('cms.editor.sendBackConfirm')}
            </PrimaryButton>
          </div>
        </form>
      </CmsModal>
    </div>
  )
}
