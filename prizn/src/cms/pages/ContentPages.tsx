import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  CmsCard,
  CmsPageHeader,
  ComingSoon,
  GhostButton,
  PrimaryButton,
  StatCard,
} from '@/cms/components/CmsUI'
import {
  Bot,
  BookOpen,
  ChartColumn,
  Film,
  ImagePlus,
  Mail,
  MapPin,
  Package,
  Search,
  Settings,
  Share2,
  ShoppingBag,
  Shield,
  Users,
  Sparkles,
  Copy,
  TrendingUp,
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

export function CmsNewsletterPage() {
  return (
    <div>
      <CmsPageHeader title="Newsletter Hub" description="Subscribers list, email editions, and readership analytics." badge="4,812 Readers" />
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Active Subscribers" value="4,812" trend="+14.2%" trendType="up" icon={Mail} sparklineData={[30, 42, 55, 68, 80]} />
        <StatCard title="Recent Campaigns" value="3 Sent" trend="100% Delivered" trendType="up" icon={BookOpen} sparklineData={[1, 2, 2, 3]} />
        <StatCard title="Average Open Rate" value="41.8%" trend="+5.1%" trendType="up" icon={TrendingUp} sparklineData={[35, 38, 40, 41.8]} />
      </div>
      <ComingSoon
        icon={Mail}
        title="Newsletter Campaign Studio"
        blurb="Design, preview, and dispatch rich HTML newsletters directly to subscriber tiers."
      />
    </div>
  )
}

export function CmsSocialPage() {
  return (
    <div>
      <CmsPageHeader title="Social Automation Desk" description="Convert published stories into optimized social snippets with AI." badge="Social Suite" />
      <ComingSoon
        icon={Share2}
        title="Multi-Platform Social Auto-Publish"
        blurb="Generate Facebook posts, Instagram carousel text, and TikTok scripts with 1-click editorial approval."
      />
    </div>
  )
}

export function CmsSeoPage() {
  return (
    <div>
      <CmsPageHeader title="SEO Health Center" description="Audit meta tags, canonical URLs, and OpenGraph social images." badge="SEO Score 94%" />
      <ComingSoon
        icon={Search}
        title="Automated SEO Audit & Meta Generator"
        blurb="Identifies missing meta descriptions and alt text across stories with one-click AI auto-fill."
      />
    </div>
  )
}

export function CmsAnalyticsPage() {
  return (
    <div>
      <CmsPageHeader title="Editorial Analytics" description="Reader engagement, dwell time, and geographical reach." badge="Live Metrics" />
      <ComingSoon
        icon={ChartColumn}
        title="Custom Editorial Analytics Engine"
        blurb="Real-time visitor heatmaps, story completion rates, and reader origin distribution."
      />
    </div>
  )
}

export function CmsShopPage() {
  return (
    <div>
      <CmsPageHeader title="Boutique Shop Cockpit" description="Handcrafted goods, prints, and limited journal editions." badge="Commerce Active" />
      <ComingSoon icon={ShoppingBag} title="Prizni Storefront Manager" blurb="Manage inventory, digital downloads, and artisanal product listings." />
    </div>
  )
}

export function CmsOrdersPage() {
  return (
    <div>
      <CmsPageHeader title="Customer Orders" description="Order fulfillment, shipping status, and receipts." badge="4 Orders Pending" />
      <ComingSoon icon={Package} title="Fulfillment Center" blurb="Track order dispatches, generate shipping labels, and manage customer receipts." />
    </div>
  )
}

export function CmsProductsPage() {
  return (
    <div>
      <CmsPageHeader title="Product Catalog" description="SKUs, print journals, and traditional artisan crafts." badge="12 Products" />
      <ComingSoon icon={Package} title="Artisan Product Catalog" blurb="Manage pricing, variants, and high-res photography for store items." />
    </div>
  )
}

export function CmsUsersPage() {
  return (
    <div>
      <CmsPageHeader title="User Directory & Access" description="Staff editors, columnists, and contributor permissions." badge="8 Team Members" />
      <ComingSoon icon={Users} title="Team Management & Auth" blurb="Invite editors, assign role permissions, and track active sessions." />
    </div>
  )
}

export function CmsRolesPage() {
  return (
    <div>
      <CmsPageHeader title="Role Access Matrix" description="Define custom access privileges for each editorial role." badge="6 Defined Roles" />
      <ComingSoon icon={Shield} title="Role-Based Security Matrix" blurb="Granular control over publishing, editing, deleting, and managing finances." />
    </div>
  )
}

export function CmsSettingsPage() {
  return (
    <div>
      <CmsPageHeader title="System Settings" description="Global platform settings, multilingual defaults, and API keys." badge="v2.4 Production" />
      <ComingSoon icon={Settings} title="Prizni OS Settings" blurb="Configure brand parameters, domain aliases, AI keys, and payment gateways." />
    </div>
  )
}

export function CmsAiPage() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)

  const runAiTool = (promptName: string) => {
    if (!input.trim()) {
      setOutput('Please paste or type a draft text in the box above first.')
      return
    }
    setLoading(true)
    setOutput('AI model analyzing draft text...')
    setTimeout(() => {
      setLoading(false)
      if (promptName === 'Better title') {
        setOutput('✨ Suggested Titles:\n1. The Silent Echo of Belogradchik Stones\n2. Walnut Paths: Walking the Forgotten Trails\n3. Hands and Thread: Crafting Memory in Bulgaria')
      } else if (promptName === 'SEO Meta') {
        setOutput('🏷️ SEO Meta Tags:\nTitle: Walnut Paths of Northwestern Bulgaria | Prizni Journal\nDescription: Discover the hidden stone villages and artisan traditions along the Belogradchik cliffs.')
      } else if (promptName === 'Translation (BG ↔ EN)') {
        setOutput('🌐 English Translation:\n"Along the walnut-lined paths of northwestern Bulgaria, time moves at the pace of morning mist over stone roofs..."')
      } else {
        setOutput(`⚡ AI Output for [${promptName}]:\nDraft analyzed successfully. Dwell time optimized and readability scored at 98.4%.`)
      }
    }, 1200)
  }

  return (
    <div>
      <CmsPageHeader
        title="AI Assistant Workbench"
        description="Transform raw drafts into polished titles, SEO descriptions, translations, and social posts."
        badge="Gemini Powered"
      />
      <CmsCard className="p-6 md:p-8">
        <label className="block font-heading text-sm font-bold uppercase tracking-wider text-stone-700 mb-2">
          Paste Story Draft or Notes
        </label>
        <textarea
          rows={7}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste draft text here (e.g. There is a specific rhythm to dawn in the stone villages of Northwestern Bulgaria...)"
          className="w-full rounded-2xl border border-[#E8E4DC] bg-[#FAF8F3] p-4 text-sm font-medium text-stone-900 outline-none focus:border-[#0C2686] focus:ring-2 focus:ring-[#0C2686]/10 transition-all placeholder:text-stone-400"
        />

        <div className="mt-5">
          <p className="font-heading text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
            Quick AI Transformation Tools
          </p>
          <div className="flex flex-wrap gap-2.5">
            {[
              'Better title',
              'SEO Meta',
              'Translation (BG ↔ EN)',
              'Summary Excerpt',
              'Instagram Post',
              'TikTok Script',
            ].map((tool) => (
              <GhostButton
                key={tool}
                disabled={loading}
                onClick={() => runAiTool(tool)}
                className="py-2 text-xs font-semibold hover:border-[#0C2686] hover:text-[#0C2686]"
              >
                <Sparkles className={cn("size-3.5 text-[#0C2686]", loading && "animate-spin")} /> {tool}
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

