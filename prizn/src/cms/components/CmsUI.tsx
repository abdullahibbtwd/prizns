import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  ChartColumn,
  FolderKanban,
  Handshake,
  HeartHandshake,
  LayoutDashboard,
  Newspaper,
  Package,
  PenLine,
  Search,
  Settings,
  Share2,
  ShoppingBag,
  Sparkles,
  Users,
  Library,
  Layers,
  Mail,
  MessageCircle,
  Bot,
  Tags,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkle,
  X,
  Award,
  Trophy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { cmsGlobalSearch } from '@/lib/cms-search-api'
import { listCmsArticles } from '@/lib/articles-api'
import { listCmsAuthors, listCmsSeries } from '@/lib/cms-content-api'
import { useAuth } from '@/lib/auth'
import { pickLang } from '@/lib/pick-lang'

export interface CmsNavItem {
  labelKey: string
  to: string
  icon: LucideIcon
  badge?: string | number
  badgeColor?: string
}

export interface CmsNavGroup {
  labelKey: string
  items: CmsNavItem[]
}

export const cmsNavGroups: CmsNavGroup[] = [
  {
    labelKey: 'cms.nav.overview',
    items: [{ labelKey: 'cms.nav.dashboard', to: '/cms', icon: LayoutDashboard }],
  },
  {
    labelKey: 'cms.nav.content',
    items: [
      { labelKey: 'cms.nav.stories', to: '/cms/stories', icon: BookOpen, badgeColor: 'bg-[#0C2686]/10 text-[#0C2686]' },
      { labelKey: 'cms.nav.series', to: '/cms/series', icon: Layers },
      { labelKey: 'cms.nav.social', to: '/cms/social', icon: Share2 },
      { labelKey: 'cms.nav.tags', to: '/cms/tags', icon: Tags },
      { labelKey: 'cms.nav.authors', to: '/cms/authors', icon: Users },
      { labelKey: 'cms.nav.media', to: '/cms/media', icon: Library },
    ],
  },
  {
    labelKey: 'cms.nav.community',
    items: [
      { labelKey: 'cms.nav.submissions', to: '/cms/submissions', icon: PenLine },
      { labelKey: 'cms.nav.donations', to: '/cms/donations', icon: HeartHandshake },
      { labelKey: 'cms.nav.partnerships', to: '/cms/partnerships', icon: Handshake },
      { labelKey: 'cms.nav.contact', to: '/cms/contact', icon: MessageCircle },
      { labelKey: 'cms.nav.newsletter', to: '/cms/newsletter', icon: Mail },
      { labelKey: 'cms.nav.badges', to: '/cms/badges', icon: Award },
      { labelKey: 'cms.nav.storyYear', to: '/cms/story-year', icon: Trophy },
    ],
  },
  {
    labelKey: 'cms.nav.marketing',
    items: [
      { labelKey: 'cms.nav.seo', to: '/cms/seo', icon: Search },
      { labelKey: 'cms.nav.analytics', to: '/cms/analytics', icon: ChartColumn },
    ],
  },
  {
    labelKey: 'cms.nav.commerce',
    items: [
      { labelKey: 'cms.nav.shop', to: '/cms/shop', icon: ShoppingBag },
      { labelKey: 'cms.nav.orders', to: '/cms/orders', icon: Package },
      { labelKey: 'cms.nav.products', to: '/cms/products', icon: FolderKanban },
    ],
  },
  {
    labelKey: 'cms.nav.system',
    items: [
      { labelKey: 'cms.nav.users', to: '/cms/users', icon: Users },
      { labelKey: 'cms.nav.settings', to: '/cms/settings', icon: Settings },
      { labelKey: 'cms.nav.ai', to: '/cms/ai', icon: Bot },
    ],
  },
]

interface CmsSidebarProps {
  onNavigate?: () => void
  collapsed?: boolean
}

export function CmsSidebar({ onNavigate }: CmsSidebarProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const displayName = user?.name?.trim() || user?.email || t('cms.editorRole')
  const displayRole =
    user?.role === 'ADMIN'
      ? t('cms.roles.admin')
      : user?.role === 'EDITOR'
        ? t('cms.roles.editor')
        : t('cms.editorRole')
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'P'

  const storiesCountQuery = useQuery({
    queryKey: ['cms-articles-count'],
    queryFn: () => listCmsArticles({ page: 1, pageSize: 1 }),
    staleTime: 30_000,
  })
  const authorsCountQuery = useQuery({
    queryKey: ['cms-authors-count'],
    queryFn: () => listCmsAuthors(true),
    staleTime: 30_000,
  })
  const seriesCountQuery = useQuery({
    queryKey: ['cms-series-count'],
    queryFn: listCmsSeries,
    staleTime: 30_000,
  })

  const storiesCount = storiesCountQuery.data?.total
  const authorsCount = authorsCountQuery.data?.length
  const seriesCount = seriesCountQuery.data?.length

  const resolveBadge = (item: CmsNavItem) => {
    if (item.to === '/cms/stories') {
      return storiesCount != null ? String(storiesCount) : item.badge
    }
    if (item.to === '/cms/authors') {
      return authorsCount != null ? String(authorsCount) : item.badge
    }
    if (item.to === '/cms/series') {
      return seriesCount != null ? String(seriesCount) : item.badge
    }
    return item.badge
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-[#E8E4DC] bg-[#FAF8F3] text-stone-900 shadow-sm transition-all duration-300">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-[#E8E4DC]/80 px-5 bg-white/60 backdrop-blur-xs">
        <Link to="/cms" onClick={onNavigate} className="flex items-center gap-3 group">
          <div className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0C2686] to-[#4051C7] text-white shadow-md shadow-[#0C2686]/20 transition-transform group-hover:scale-105">
            <span className="font-heading text-lg font-bold tracking-widest text-amber-100">P</span>
            <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex size-2.5 rounded-full bg-amber-400"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-heading text-base font-bold tracking-tight text-stone-900 leading-none">PRIZNI</p>
              <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800 uppercase tracking-wider">
                {t('cms.editorial')}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] font-medium tracking-[0.2em] text-stone-600 uppercase">
              {t('cms.managementOs')}
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin">
        {cmsNavGroups.map((group) => (
          <div key={group.labelKey}>
            <div className="mb-2 px-2.5 flex items-center justify-between">
              <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-600">
                {t(group.labelKey)}
              </p>
              <span className="h-px flex-1 ml-3 bg-[#E8E4DC]"></span>
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                const badge = resolveBadge(item)
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/cms'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center justify-between rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200',
                        isActive
                          ? 'bg-white text-[#0C2686] font-semibold shadow-xs ring-1 ring-[#0C2686]/15'
                          : 'text-stone-600 hover:bg-stone-200/50 hover:text-stone-900',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex size-7 items-center justify-center rounded-lg transition-colors',
                              isActive
                                ? 'bg-[#0C2686] text-white shadow-xs'
                                : 'bg-stone-200/60 text-stone-600 group-hover:bg-white group-hover:text-stone-900',
                            )}
                          >
                            <Icon className="size-3.5 stroke-[2]" />
                          </div>
                          <span className="tracking-tight">{t(item.labelKey)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {badge != null && badge !== '' && (
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-medium leading-none',
                                item.badgeColor ??
                                  (isActive
                                    ? 'bg-[#0C2686]/10 text-[#0C2686]'
                                    : 'bg-stone-200 text-stone-600 group-hover:bg-stone-300/60'),
                              )}
                            >
                              {badge}
                            </span>
                          )}
                          {isActive && (
                            <span className="absolute right-1 top-1/2 -translate-y-1/2 h-4 w-1 rounded-full bg-[#0C2686]" />
                          )}
                        </div>
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Editor Profile & Journal Link Footer */}
      <div className="border-t border-[#E8E4DC] p-3.5 bg-white/50 backdrop-blur-xs space-y-2">
        <div className="flex items-center gap-3 rounded-xl border border-[#E8E4DC] bg-white p-2.5 shadow-xs">
          <div className="relative">
            <div
              aria-hidden
              className="flex size-9 items-center justify-center rounded-full border border-[#0C2686]/20 bg-[#0C2686] text-[11px] font-bold tracking-wide text-white shadow-xs"
            >
              {initials}
            </div>
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-stone-900">{displayName}</p>
            <p className="truncate text-[10px] font-medium uppercase tracking-wider text-amber-800">
              {displayRole}
            </p>
          </div>
        </div>

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between rounded-xl border border-[#E8E4DC] bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-700 transition-all duration-200 hover:border-[#0C2686]/30 hover:bg-[#0C2686] hover:text-white shadow-2xs"
        >
          <span className="flex items-center gap-2">
            <Newspaper className="size-3.5 text-[#0C2686] group-hover:text-amber-300 transition-colors" />
            <span className="font-heading text-xs tracking-wide">{t('cms.viewJournal')}</span>
          </span>
          <ExternalLink className="size-3 text-stone-400 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
        </a>
      </div>
    </aside>
  )
}

export function CmsPageHeader({
  title,
  description,
  actions,
  badge,
}: {
  title: string
  description?: string
  actions?: ReactNode
  badge?: string
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E8E4DC]/60 pb-6">
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-stone-900 leading-tight">
            {title}
          </h1>
          {badge && (
            <span className="rounded-full bg-[#0C2686]/10 px-3 py-1 text-xs font-semibold text-[#0C2686] border border-[#0C2686]/20 shadow-2xs">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="mt-1.5 text-sm text-stone-600 max-w-3xl leading-relaxed">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  )
}

export function CmsCard({
  children,
  className,
  hover = true,
}: {
  children: ReactNode
  className?: string
  hover?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[#E8E4DC] bg-white text-stone-900 shadow-2xs transition-all duration-300',
        hover && 'hover:shadow-md hover:border-[#0C2686]/30 hover:-translate-y-0.5',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function StatusPill({ status }: { status: string }) {
  const { t, i18n } = useTranslation()
  const key = status.toLowerCase()
  const map: Record<string, { style: string; dot: string }> = {
    draft: { style: 'bg-stone-100 text-stone-700 border-stone-200/80', dot: 'bg-stone-400' },
    review: { style: 'bg-amber-50 text-amber-800 border-amber-200/80', dot: 'bg-amber-500 animate-pulse' },
    scheduled: { style: 'bg-sky-50 text-sky-800 border-sky-200/80', dot: 'bg-sky-500' },
    published: { style: 'bg-emerald-50 text-emerald-800 border-emerald-200/80', dot: 'bg-emerald-500' },
    archived: { style: 'bg-stone-100 text-stone-500 border-stone-200', dot: 'bg-stone-400' },
    active: { style: 'bg-emerald-50 text-emerald-800 border-emerald-200/80', dot: 'bg-emerald-500' },
    pending: { style: 'bg-amber-50 text-amber-800 border-amber-200/80', dot: 'bg-amber-500' },
    running: { style: 'bg-sky-50 text-sky-800 border-sky-200/80', dot: 'bg-sky-500 animate-pulse' },
    ready: { style: 'bg-emerald-50 text-emerald-800 border-emerald-200/80', dot: 'bg-emerald-500' },
    failed: { style: 'bg-rose-50 text-rose-800 border-rose-200/80', dot: 'bg-rose-500' },
    idle: { style: 'bg-stone-100 text-stone-600 border-stone-200/80', dot: 'bg-stone-400' },
    new: { style: 'bg-violet-50 text-violet-800 border-violet-200/80', dot: 'bg-violet-500 animate-pulse' },
    changes: { style: 'bg-orange-50 text-orange-800 border-orange-200/80', dot: 'bg-orange-500' },
    approved: { style: 'bg-emerald-50 text-emerald-800 border-emerald-200/80', dot: 'bg-emerald-500' },
    sent: { style: 'bg-emerald-50 text-emerald-800 border-emerald-200/80', dot: 'bg-emerald-500' },
    rejected: { style: 'bg-rose-50 text-rose-800 border-rose-200/80', dot: 'bg-rose-500' },
    admin: { style: 'bg-violet-50 text-violet-800 border-violet-200/80', dot: 'bg-violet-500' },
    editor: { style: 'bg-sky-50 text-sky-800 border-sky-200/80', dot: 'bg-sky-500' },
    completed: { style: 'bg-emerald-50 text-emerald-800 border-emerald-200/80', dot: 'bg-emerald-500' },
    contacted: { style: 'bg-sky-50 text-sky-800 border-sky-200/80', dot: 'bg-sky-500' },
    negotiating: { style: 'bg-amber-50 text-amber-800 border-amber-200/80', dot: 'bg-amber-500' },
    won: { style: 'bg-emerald-50 text-emerald-800 border-emerald-200/80', dot: 'bg-emerald-500' },
    lost: { style: 'bg-stone-100 text-stone-500 border-stone-200', dot: 'bg-stone-400' },
    closed: { style: 'bg-stone-100 text-stone-500 border-stone-200', dot: 'bg-stone-400' },
    replied: { style: 'bg-sky-50 text-sky-800 border-sky-200/80', dot: 'bg-sky-500' },
    cancelled: { style: 'bg-stone-100 text-stone-500 border-stone-200', dot: 'bg-stone-400' },
    open: { style: 'bg-emerald-50 text-emerald-800 border-emerald-200/80', dot: 'bg-emerald-500 animate-pulse' },
  }

  const current = map[key] ?? {
    style: 'bg-stone-100 text-stone-700 border-stone-200',
    dot: 'bg-stone-400',
  }

  const statusKey = `cms.status.${key}`
  const label = i18n.exists(statusKey) ? t(statusKey) : status

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider border shadow-2xs',
        current.style,
      )}
    >
      <span className={cn('size-1.5 rounded-full', current.dot)} />
      {label}
    </span>
  )
}

export function MiniSparkline({
  data = [12, 18, 14, 22, 28, 25, 34],
  color = '#0C2686',
}: {
  data?: number[]
  color?: string
}) {
  const max = Math.max(...data, 1)
  const min = Math.min(...data)
  const range = max - min || 1
  const height = 24
  const width = 64

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width
      const y = height - ((val - min) / range) * (height - 4) - 2
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg className="h-6 w-16 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

export function StatCard({
  title,
  value,
  trend,
  trendType = 'up',
  hint,
  icon: Icon,
  sparklineData,
  onClick,
  active = false,
}: {
  title: string
  value: string
  trend?: string
  trendType?: 'up' | 'down' | 'neutral'
  hint?: string
  icon: LucideIcon
  sparklineData?: number[]
  onClick?: () => void
  active?: boolean
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5 transition-all duration-300',
        onClick ? 'cursor-pointer' : '',
        active
          ? 'border-[#0C2686] bg-gradient-to-br from-white via-amber-50/20 to-blue-50/30 shadow-md ring-2 ring-[#0C2686]/20'
          : 'border-[#E8E4DC] bg-white hover:border-[#0C2686]/30 hover:shadow-xl hover:-translate-y-1',
      )}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2">
        <p className="font-heading text-xs font-bold uppercase tracking-[0.16em] text-stone-500 truncate min-w-0">
          {title}
        </p>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#0C2686]/10 text-[#0C2686] shadow-2xs group-hover:bg-[#0C2686] group-hover:text-white transition-all duration-300">
          <Icon className="size-4.5 stroke-[2]" />
        </div>
      </div>

      {/* Main Stat Value Row */}
      <div className="my-3 min-w-0">
        <h3 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 group-hover:text-[#0C2686] transition-colors truncate">
          {value}
        </h3>
      </div>

      {/* Bottom Trend & Sparkline Row */}
      <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
        {trend ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold shrink-0',
              trendType === 'up'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                : trendType === 'down'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200/80'
                  : 'bg-stone-100 text-stone-700 border border-stone-200',
            )}
          >
            {trendType === 'up' && <TrendingUp className="size-3 stroke-[2.5]" />}
            {trendType === 'down' && <TrendingDown className="size-3 stroke-[2.5]" />}
            {trendType === 'neutral' && <Minus className="size-3 stroke-[2.5]" />}
            {trend}
          </span>
        ) : <span />}

        {sparklineData && (
          <div className="shrink-0">
            <MiniSparkline
              data={sparklineData}
              color={trendType === 'down' ? '#E11D48' : '#0C2686'}
            />
          </div>
        )}
      </div>

      {/* Footer Hint */}
      {hint && (
        <div className="mt-3 flex items-center justify-between border-t border-[#E8E4DC]/80 pt-2.5 text-[11px] font-semibold text-stone-500">
          <span className="truncate">{hint}</span>
          <ChevronRight className="size-3 text-stone-400 group-hover:translate-x-1 group-hover:text-[#0C2686] transition-all shrink-0" />
        </div>
      )}
    </div>
  )
}

export function PrimaryButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0C2686] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0C2686]/20 transition-all duration-200 hover:bg-[#4051C7] hover:shadow-lg hover:shadow-[#0C2686]/30 active:scale-95 disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function GhostButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#E8E4DC] bg-white px-4 py-2.5 text-sm font-medium text-stone-700 shadow-2xs transition-all duration-200 hover:border-[#0C2686]/30 hover:bg-stone-50 hover:text-stone-900 active:scale-95 disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function QuickSearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'bg'
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setDebounced('')
    }
  }, [isOpen])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [query])

  const enabled = isOpen && debounced.length >= 2
  const searchQuery = useQuery({
    queryKey: ['cms-global-search', debounced],
    queryFn: () => cmsGlobalSearch(debounced),
    enabled,
    placeholderData: (prev) => prev,
  })

  if (!isOpen) return null

  const handleSelect = (url: string) => {
    navigate(url)
    onClose()
  }

  const data = searchQuery.data
  const hasResults =
    (data?.stories.length ?? 0) +
      (data?.authors.length ?? 0) +
      (data?.submissions.length ?? 0) +
      (data?.tags.length ?? 0) >
    0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-stone-900/60 px-4 pt-20 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-[#E8E4DC] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center gap-3 border-b border-[#E8E4DC] bg-[#FAF8F3] px-4 py-3.5">
          <Search className="size-5 text-[#0C2686]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('cms.quickSearch.placeholder')}
            className="flex-1 bg-transparent text-base font-medium text-stone-900 outline-none placeholder:text-stone-400"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-800"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto p-4">
          {debounced.length < 2 ? (
            <div className="py-8 text-center text-stone-600">
              <Sparkles className="mx-auto mb-2 size-8 text-[#0C2686]/40" />
              <p className="text-sm font-medium">
                {t('cms.quickSearch.emptyHint')}
              </p>
              <p className="mt-1 text-xs text-stone-400">
                {t('cms.quickSearch.emptyBody')}
              </p>
            </div>
          ) : searchQuery.isFetching && !data ? (
            <p className="py-8 text-center text-sm text-stone-500">
              {t('cms.quickSearch.loading')}
            </p>
          ) : !hasResults ? (
            <p className="py-8 text-center text-sm text-stone-500">
              {t('cms.quickSearch.noResults', { q: debounced })}
            </p>
          ) : (
            <>
              {(data?.stories.length ?? 0) > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-600">
                    {t('cms.quickSearch.stories', {
                      count: data!.stories.length,
                    })}
                  </p>
                  <div className="space-y-1">
                    {data!.stories.map((story) => (
                      <button
                        key={story.id}
                        type="button"
                        onClick={() =>
                          handleSelect(`/cms/stories/${story.id}`)
                        }
                        className="flex w-full items-center justify-between rounded-xl p-2.5 text-left transition-colors hover:bg-stone-100"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <BookOpen className="size-4 shrink-0 text-[#0C2686]" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-stone-900">
                              {pickLang(lang, story.titleEn, story.titleBg)}
                            </p>
                            <p className="truncate text-xs text-stone-600">
                              {pickLang(
                                lang,
                                story.authorEn,
                                story.authorBg,
                              ) || '—'}{' '}
                              · {story.categoryBg}
                            </p>
                          </div>
                        </div>
                        <StatusPill status={story.status} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(data?.submissions.length ?? 0) > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-600">
                    {t('cms.quickSearch.submissions', {
                      count: data!.submissions.length,
                    })}
                  </p>
                  <div className="space-y-1">
                    {data!.submissions.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() =>
                          handleSelect(`/cms/submissions/${sub.id}`)
                        }
                        className="flex w-full items-center justify-between rounded-xl p-2.5 text-left transition-colors hover:bg-stone-100"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <PenLine className="size-4 shrink-0 text-amber-600" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-stone-900">
                              {sub.title}
                            </p>
                            <p className="truncate text-xs text-stone-600">
                              {sub.name} · {sub.place}
                            </p>
                          </div>
                        </div>
                        <StatusPill status={sub.status} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(data?.authors.length ?? 0) > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-600">
                    {t('cms.quickSearch.authors', {
                      count: data!.authors.length,
                    })}
                  </p>
                  <div className="space-y-1">
                    {data!.authors.map((author) => (
                      <button
                        key={author.id}
                        type="button"
                        onClick={() =>
                          handleSelect(`/cms/authors/${author.id}`)
                        }
                        className="flex w-full items-center justify-between rounded-xl p-2.5 text-left transition-colors hover:bg-stone-100"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Users className="size-4 shrink-0 text-violet-600" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-stone-900">
                              {pickLang(lang, author.nameEn, author.nameBg)}
                            </p>
                            <p className="truncate text-xs text-stone-600">
                              {pickLang(lang, author.roleEn, author.roleBg)} ·{' '}
                              {author.locationBg}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-stone-500">
                          {t('cms.quickSearch.storiesCount', {
                            count: author.stories,
                          })}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(data?.tags.length ?? 0) > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-600">
                    {t('cms.quickSearch.tags', { count: data!.tags.length })}
                  </p>
                  <div className="space-y-1">
                    {data!.tags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleSelect('/cms/tags')}
                        className="flex w-full items-center justify-between rounded-xl p-2.5 text-left transition-colors hover:bg-stone-100"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Tags className="size-4 shrink-0 text-emerald-700" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-stone-900">
                              {pickLang(lang, tag.nameEn, tag.nameBg)}
                            </p>
                            <p className="truncate text-xs text-stone-600">
                              {tag.kind} · /{tag.slug}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function ComingSoon({
  title,
  blurb,
  icon: Icon = Sparkles,
}: {
  title: string
  blurb: string
  icon?: LucideIcon
}) {
  return (
    <CmsCard className="flex flex-col items-start gap-5 p-8 md:p-10 bg-gradient-to-br from-white via-amber-50/10 to-stone-50">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-[#0C2686]/20 bg-[#0C2686]/10 text-[#0C2686] shadow-2xs">
        <Icon className="size-6" />
      </div>
      <div>
        <h2 className="font-heading text-2xl font-bold text-stone-900">{title}</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-600">{blurb}</p>
      </div>
      <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
        <Sparkle className="size-3.5 text-amber-600" />
        Feature module scheduled in roadmap
      </div>
    </CmsCard>
  )
}

