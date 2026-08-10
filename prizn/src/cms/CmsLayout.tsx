import { useState, useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, Search, Bell, X, Sparkles, ChevronRight, CheckCircle2, AlertCircle, LogOut, Globe } from 'lucide-react'
import { CmsSidebar, QuickSearchModal } from '@/cms/components/CmsUI'
import { useAuth } from '@/lib/auth'
import { useJournalLang } from '@/hooks/useJournalLang'

export function CmsLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
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
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs">
              <Link
                to="/cms"
                className="font-heading font-semibold text-stone-500 hover:text-[#0C2686] transition-colors"
              >
                {t('cms.editorialOs')}
              </Link>
              <ChevronRight className="size-3 text-stone-400" />
              <span className="capitalize font-semibold text-stone-900 bg-stone-100 px-2.5 py-1 rounded-md border border-stone-200/80">
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

            {/* Notifications Menu Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((prev) => !prev)}
                className="relative cursor-pointer rounded-xl border border-[#E8E4DC] bg-stone-50 p-2.5 text-stone-600 transition-colors hover:border-[#0C2686]/30 hover:bg-white hover:text-stone-900 shadow-2xs"
              >
                <Bell className="size-4.5" />
                <span className="absolute top-2 right-2 size-2 rounded-full bg-amber-500 ring-2 ring-white" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-[#E8E4DC] bg-white p-4 shadow-xl z-50 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <p className="font-heading text-sm font-bold text-stone-900">{t('cms.notifications')}</p>
                    <span className="rounded-full bg-[#0C2686]/10 px-2 py-0.5 text-[10px] font-bold text-[#0C2686]">
                      {t('cms.newCount', { count: 3 })}
                    </span>
                  </div>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-start gap-3 rounded-xl p-2 bg-stone-50 hover:bg-stone-100/80 transition-colors">
                      <CheckCircle2 className="size-4 text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-stone-900">New Submission Received</p>
                        <p className="text-[11px] text-stone-500">Elena M. submitted "My grandmother’s bread oven"</p>
                        <span className="text-[10px] text-stone-400">10m ago</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-xl p-2 bg-stone-50 hover:bg-stone-100/80 transition-colors">
                      <Sparkles className="size-4 text-[#0C2686] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-stone-900">AI SEO Insight Ready</p>
                        <p className="text-[11px] text-stone-500">5 articles missing meta descriptions</p>
                        <span className="text-[10px] text-stone-400">1h ago</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-xl p-2 bg-stone-50 hover:bg-stone-100/80 transition-colors">
                      <AlertCircle className="size-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-stone-900">Review Reminder</p>
                        <p className="text-[11px] text-stone-500">Episode 4 draft is pending review</p>
                        <span className="text-[10px] text-stone-400">3h ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <div className="text-right">
                <p className="text-xs font-semibold text-stone-900">{user?.name ?? t('cms.editorRole')}</p>
                <p className="text-[10px] text-stone-500">{user?.role}</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await logout()
                  navigate('/cms/login', { replace: true })
                }}
                className="rounded-xl border border-[#E8E4DC] bg-stone-50 p-2.5 text-stone-600 transition-colors hover:bg-white hover:text-stone-900"
                title={t('cms.signOut')}
              >
                <LogOut className="size-4.5" />
              </button>
            </div>
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

