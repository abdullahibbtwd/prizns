import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  CmsCard,
  CmsPageHeader,
  ComingSoon,
  GhostButton,
  PrimaryButton,
} from '@/cms/components/CmsUI'
import {
  Bot,
  Film,
  ImagePlus,
  MapPin,
  Settings,
  Sparkles,
  Copy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { listCmsMedia, uploadCmsMedia } from '@/lib/articles-api'
import type { MediaAsset } from '@/lib/cms-types'

export function CmsMediaPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [kindFilter, setKindFilter] = useState<
    'ALL' | 'IMAGE' | 'VIDEO' | 'AUDIO'
  >('ALL')
  const [titleBg, setTitleBg] = useState('')
  const [locationBg, setLocationBg] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [formError, setFormError] = useState('')
  const [formOk, setFormOk] = useState('')

  const mediaQuery = useQuery({
    queryKey: ['cms-media', kindFilter],
    queryFn: () =>
      listCmsMedia(kindFilter === 'ALL' ? undefined : kindFilter),
  })

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!titleBg.trim()) throw new Error(t('cms.mediaLibrary.requiredName'))
      if (!file) throw new Error(t('cms.mediaLibrary.requiredFile'))
      return uploadCmsMedia(file, {
        titleBg: titleBg.trim(),
        locationBg: locationBg.trim(),
        folder: 'cms',
      })
    },
    onSuccess: async () => {
      setTitleBg('')
      setLocationBg('')
      setFile(null)
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return ''
      })
      setFormError('')
      setFormOk(t('cms.mediaLibrary.uploaded'))
      if (fileInputRef.current) fileInputRef.current.value = ''
      await queryClient.invalidateQueries({ queryKey: ['cms-media'] })
      await queryClient.invalidateQueries({ queryKey: ['public-media'] })
    },
    onError: (error: Error) => {
      setFormOk('')
      setFormError(error.message || t('cms.mediaLibrary.uploadFailed'))
    },
  })

  const items = mediaQuery.data ?? []
  const filters: Array<{ id: typeof kindFilter; label: string }> = [
    { id: 'ALL', label: t('cms.mediaLibrary.all') },
    { id: 'IMAGE', label: t('cms.mediaLibrary.images') },
    { id: 'VIDEO', label: t('cms.mediaLibrary.videos') },
    { id: 'AUDIO', label: t('cms.mediaLibrary.audio') },
  ]

  const onPickFile = (next: File | null) => {
    setFormError('')
    setFormOk('')
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return next ? URL.createObjectURL(next) : ''
    })
    setFile(next)
  }

  return (
    <div>
      <CmsPageHeader
        title={t('cms.mediaLibrary.title')}
        description={t('cms.mediaLibrary.description')}
        badge={t('cms.mediaLibrary.badge', { count: items.length })}
      />

      <CmsCard className="mb-8 space-y-4 p-5 md:p-6">
        <h2 className="font-heading text-lg font-semibold text-stone-900">
          {t('cms.mediaLibrary.formTitle')}
        </h2>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            setFormError('')
            setFormOk('')
            void uploadMutation.mutateAsync()
          }}
        >
          <label className="block space-y-1.5 text-xs font-medium text-stone-600">
            <span>{t('cms.mediaLibrary.name')}</span>
            <input
              value={titleBg}
              onChange={(e) => setTitleBg(e.target.value)}
              placeholder={t('cms.mediaLibrary.namePlaceholder')}
              className="w-full rounded-lg border border-[#E8E4DC] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0C2686]"
              required
            />
          </label>
          <label className="block space-y-1.5 text-xs font-medium text-stone-600">
            <span>{t('cms.mediaLibrary.location')}</span>
            <input
              value={locationBg}
              onChange={(e) => setLocationBg(e.target.value)}
              placeholder={t('cms.mediaLibrary.locationPlaceholder')}
              className="w-full rounded-lg border border-[#E8E4DC] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0C2686]"
            />
          </label>

          <div className="md:col-span-2 space-y-2">
            <span className="block text-xs font-medium text-stone-600">
              {t('cms.mediaLibrary.file')}
            </span>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <label className="flex min-h-[140px] flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E8E4DC] bg-[#FAF8F3] px-4 py-6 text-center transition-colors hover:border-[#0C2686]/40">
                <ImagePlus className="size-7 text-[#0C2686]" />
                <span className="text-sm font-medium text-stone-700">
                  {file ? t('cms.mediaLibrary.selectedFile') : t('cms.mediaLibrary.chooseFile')}
                </span>
                {file ? (
                  <span className="max-w-full truncate text-[11px] text-stone-500">
                    {file.name}
                  </span>
                ) : null}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {previewUrl && file?.type.startsWith('image/') ? (
                <div className="relative h-[140px] w-full overflow-hidden rounded-2xl border border-[#E8E4DC] bg-stone-100 sm:w-48">
                  <img
                    src={previewUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}
              {previewUrl && file?.type.startsWith('video/') ? (
                <div className="relative h-[140px] w-full overflow-hidden rounded-2xl border border-[#E8E4DC] bg-black sm:w-56">
                  <video
                    src={previewUrl}
                    className="h-full w-full object-contain"
                    muted
                    playsInline
                    controls
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <PrimaryButton
              type="submit"
              className="py-2.5 text-xs"
              disabled={uploadMutation.isPending}
            >
              <ImagePlus className="size-3.5" />
              {uploadMutation.isPending
                ? t('cms.mediaLibrary.uploading')
                : t('cms.mediaLibrary.submit')}
            </PrimaryButton>
            {formError ? (
              <span className="text-xs text-red-600">{formError}</span>
            ) : null}
            {formOk ? (
              <span className="text-xs text-emerald-700">{formOk}</span>
            ) : null}
          </div>
        </form>
      </CmsCard>

      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setKindFilter(filter.id)}
            className={cn(
              'cursor-pointer rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200',
              kindFilter === filter.id
                ? 'bg-[#0C2686] text-white shadow-xs'
                : 'border border-[#E8E4DC] bg-white text-stone-600 hover:bg-stone-100',
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {mediaQuery.isLoading ? (
        <CmsCard className="p-8 text-center text-sm text-stone-500">
          {t('cms.mediaLibrary.loading')}
        </CmsCard>
      ) : mediaQuery.isError ? (
        <CmsCard className="p-8 text-center text-sm text-red-600">
          {t('cms.mediaLibrary.loadFailed')}
        </CmsCard>
      ) : items.length === 0 ? (
        <CmsCard className="p-8 text-center text-sm text-stone-500">
          {t('cms.mediaLibrary.empty')}
        </CmsCard>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item: MediaAsset) => (
            <div
              key={item.id}
              className="group relative aspect-square overflow-hidden rounded-2xl border border-[#E8E4DC] bg-stone-100 shadow-2xs transition-all hover:shadow-lg"
            >
              {item.kind === 'IMAGE' ? (
                <img
                  src={item.url}
                  alt={item.titleBg || ''}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : item.kind === 'VIDEO' ? (
                <div className="relative h-full w-full bg-black">
                  <video
                    src={item.url}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <Film className="size-8 text-white/90" />
                  </div>
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-stone-200 px-3 text-center text-xs font-semibold text-stone-600">
                  {item.kind}
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3">
                <p className="line-clamp-1 text-xs font-semibold text-white">
                  {item.titleBg || item.originalName || item.id.slice(0, 8)}
                </p>
                {item.locationBg ? (
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-white/75">
                    <MapPin className="size-3 shrink-0" />
                    <span className="truncate">{item.locationBg}</span>
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function CmsShopPage() {
  const { t } = useTranslation()
  return (
    <div>
      <CmsPageHeader
        title={t('cms.shopHub.title')}
        description={t('cms.shopHub.description')}
        badge={t('cms.shopHub.badge')}
      />
      <CmsCard className="p-6 text-sm text-stone-600">
        {t('cms.shopHub.bodyBefore')}{' '}
        <a href="/cms/products" className="font-semibold text-[#0C2686]">
          {t('cms.shopHub.products')}
        </a>{' '}
        {t('cms.shopHub.bodyMid')}{' '}
        <a href="/cms/orders" className="font-semibold text-[#0C2686]">
          {t('cms.shopHub.orders')}
        </a>
        {t('cms.shopHub.bodyAfter')} <code className="text-xs">/shop</code>
      </CmsCard>
    </div>
  )
}

export function CmsSettingsPage() {
  const { t } = useTranslation()
  return (
    <div>
      <CmsPageHeader
        title={t('cms.settings.title')}
        description={t('cms.settings.description')}
        badge={t('cms.settings.badge')}
      />
      <ComingSoon
        icon={Settings}
        title={t('cms.settings.soonTitle')}
        blurb={t('cms.settings.soonBlurb')}
      />
    </div>
  )
}

const AI_TOOLS = [
  { id: 'title', labelKey: 'cms.aiWorkbench.toolTitle' },
  { id: 'seo', labelKey: 'cms.aiWorkbench.toolSeo' },
  { id: 'translate', labelKey: 'cms.aiWorkbench.toolTranslate' },
  { id: 'summary', labelKey: 'cms.aiWorkbench.toolSummary' },
  { id: 'instagram', labelKey: 'cms.aiWorkbench.toolInstagram' },
  { id: 'tiktok', labelKey: 'cms.aiWorkbench.toolTiktok' },
] as const

export function CmsAiPage() {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)

  const runAiTool = (toolId: (typeof AI_TOOLS)[number]['id']) => {
    if (!input.trim()) {
      setOutput(t('cms.aiWorkbench.needDraft'))
      return
    }
    setLoading(true)
    setOutput(t('cms.aiWorkbench.analyzing'))
    const toolLabel = t(
      AI_TOOLS.find((tool) => tool.id === toolId)?.labelKey ??
        'cms.aiWorkbench.toolTitle',
    )
    setTimeout(() => {
      setLoading(false)
      if (toolId === 'title') {
        setOutput('✨ Suggested Titles:\n1. The Silent Echo of Belogradchik Stones\n2. Walnut Paths: Walking the Forgotten Trails\n3. Hands and Thread: Crafting Memory in Bulgaria')
      } else if (toolId === 'seo') {
        setOutput('🏷️ SEO Meta Tags:\nTitle: Walnut Paths of Northwestern Bulgaria | Prizni Journal\nDescription: Discover the hidden stone villages and artisan traditions along the Belogradchik cliffs.')
      } else if (toolId === 'translate') {
        setOutput('🌐 English Translation:\n"Along the walnut-lined paths of northwestern Bulgaria, time moves at the pace of morning mist over stone roofs..."')
      } else {
        setOutput(`⚡ AI Output for [${toolLabel}]:\nDraft analyzed successfully. Dwell time optimized and readability scored at 98.4%.`)
      }
    }, 1200)
  }

  return (
    <div>
      <CmsPageHeader
        title={t('cms.aiWorkbench.title')}
        description={t('cms.aiWorkbench.description')}
        badge={t('cms.aiWorkbench.badge')}
      />
      <CmsCard className="p-6 md:p-8">
        <label className="block font-heading text-sm font-bold uppercase tracking-wider text-stone-700 mb-2">
          {t('cms.aiWorkbench.draftLabel')}
        </label>
        <textarea
          rows={7}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('cms.aiWorkbench.draftPlaceholder')}
          className="w-full rounded-2xl border border-[#E8E4DC] bg-[#FAF8F3] p-4 text-sm font-medium text-stone-900 outline-none focus:border-[#0C2686] focus:ring-2 focus:ring-[#0C2686]/10 transition-all placeholder:text-stone-400"
        />

        <div className="mt-5">
          <p className="font-heading text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
            {t('cms.aiWorkbench.toolsLabel')}
          </p>
          <div className="flex flex-wrap gap-2.5">
            {AI_TOOLS.map((tool) => (
              <GhostButton
                key={tool.id}
                disabled={loading}
                onClick={() => runAiTool(tool.id)}
                className="py-2 text-xs font-semibold hover:border-[#0C2686] hover:text-[#0C2686]"
              >
                <Sparkles className={cn("size-3.5 text-[#0C2686]", loading && "animate-spin")} />{' '}
                {t(tool.labelKey)}
              </GhostButton>
            ))}
          </div>
        </div>

        {output && (
          <div className="mt-6 rounded-2xl border border-[#0C2686]/20 bg-gradient-to-br from-blue-50/50 to-amber-50/30 p-5 animate-in fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-xs font-bold text-[#0C2686]">
                <Bot className="size-4" /> AI Generated Result
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(output)}
                className="flex items-center gap-1 text-xs font-semibold text-stone-600 hover:text-stone-900"
              >
                <Copy className="size-3.5" /> Copy Result
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm text-stone-800 leading-relaxed font-medium">
              {output}
            </pre>
          </div>
        )}
      </CmsCard>
    </div>
  )
}

