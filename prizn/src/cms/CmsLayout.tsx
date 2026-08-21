import { useState, useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, Search, X, ChevronRight, Globe } from 'lucide-react'
import { CmsSidebar, QuickSearchModal } from '@/cms/components/CmsUI'
import { useAuth } from '@/lib/auth'
import { useJournalLang } from '@/hooks/useJournalLang'

export function CmsLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()
  const { user } = useAuth()
  const { t } = useTranslation()
  const { lang, setLang } = useJournalLang()
  const crumbSegment = location.pathname.replace(/^\/cms\/?/, '').split('/')[0] || 'dashboard'
  const crumbKey = `cms.nav.${crumbSegment === 'dashboard' ? 'dashboard' : crumbSegment}`
  const crumbLabel = t(crumbKey, { defaultValue: crumbSegment })

  const isStoryEditor = /^\/cms\/stories\/[^/]+\/?$/.test(location.pathname)

  // Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Trap scroll inside the CMS shell — never scroll the document behind it.
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
    }
  }, [])

  return (
    <div className="flex h-svh max-h-svh overflow-hidden bg-[#FAF8F3] font-sans text-stone-900 antialiased">
      {/* Desktop Sidebar */}
      <div className="hidden h-full lg:block">
        <CmsSidebar />
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden animate-in fade-in duration-200">
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/50 backdrop-blur-xs"
            aria-label={t('cms.closeMenu')}
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 h-full">
            <CmsSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="absolute right-4 top-4 z-20 rounded-xl bg-white p-2.5 text-stone-700 shadow-lg border border-[#E8E4DC]"
          >
            <X className="size-5" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Glassmorphic Sticky Header */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-[#E8E4DC] bg-white/80 backdrop-blur-md px-4 md:px-8 shadow-2xs">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="cursor-pointer rounded-xl border border-[#E8E4DC] bg-stone-50 p-2 text-stone-700 hover:bg-stone-100 lg:hidden shadow-2xs transition-colors"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
            </button>
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-xs">
              <Link
                to="/cms"
                className="hidden font-heading font-semibold text-stone-500 transition-colors hover:text-[#0C2686] md:inline"
              >
                {t('cms.editorialOs')}
              </Link>
              <ChevronRight className="hidden size-3 text-stone-400 md:block" />
              <span className="truncate rounded-md border border-stone-200/80 bg-stone-100 px-2.5 py-1 font-semibold capitalize text-stone-900">
                {crumbLabel}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="group hidden items-center gap-3 rounded-xl border border-[#E8E4DC] bg-stone-50/80 px-3.5 py-2 text-xs font-medium text-stone-500 transition-all hover:border-[#0C2686]/40 hover:bg-white hover:text-stone-900 shadow-2xs sm:flex"
            >
              <Search className="size-4 text-[#0C2686] group-hover:scale-110 transition-transform" />
              <span>{t('cms.searchPlaceholder')}</span>
              <kbd className="rounded-md border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-stone-500 shadow-2xs">
                ⌘K
              </kbd>
            </button>

            {/* Mobile Search Icon */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex sm:hidden rounded-xl border border-[#E8E4DC] bg-stone-50 p-2 text-stone-600 hover:bg-white shadow-2xs"
            >
              <Search className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => setLang(lang === 'bg' ? 'en' : 'bg')}
              className="flex items-center gap-1.5 rounded-xl border border-[#E8E4DC] bg-stone-50 px-2.5 py-2 text-[11px] font-semibold uppercase tracking-widest text-stone-600 transition-colors hover:border-[#0C2686]/30 hover:bg-white hover:text-[#0C2686]"
              title={t('cms.langToggle')}
            >
              <Globe className="size-3.5 stroke-[1.5]" />
              <span>{lang.toUpperCase()}</span>
            </button>

            <Link
              to="/cms/profile"
              title={t('cms.nav.profile')}
              className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#0C2686]/20 bg-[#0C2686] text-[11px] font-bold tracking-wide text-white shadow-xs transition hover:ring-2 hover:ring-[#0C2686]/30"
            >
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.name || user.email || t('cms.nav.profile')}
                  className="size-full object-cover"
                />
              ) : (
                <span aria-hidden>
                  {(user?.name?.trim() || user?.email || 'P')
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase() ?? '')
                    .join('') || 'P'}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Page Content Container — story editor owns its own scroller */}
        <main
          className={
            isStoryEditor
              ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
              : 'min-h-0 flex-1 overflow-y-auto'
          }
        >
          <div
            className={
              isStoryEditor
                ? 'mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col overflow-hidden px-4 py-4 md:px-8 lg:px-10'
                : 'mx-auto max-w-7xl px-4 py-8 md:px-8 lg:px-10'
            }
          >
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Quick Search Modal */}
      <QuickSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}

