import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Search, Globe, Heart, ChevronDown, PenLine, Handshake, Bookmark, Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Logo } from '@/components/Logo'
import { cn } from '@/lib/utils'
import { getPrimaryNavLinks } from '@/data/concept-3/nav'
import { useReaderAuth } from '@/lib/reader-auth'
import { MobileNavMenu } from '@/components/concept-3/MobileNavMenu'
import { JournalSearchOverlay } from '@/components/concept-3/JournalSearchOverlay'

interface MinimalNavProps {
  lang: 'bg' | 'en'
  setLang: (lang: 'bg' | 'en') => void
  variant?: 'hero' | 'solid'
}

export function MinimalNav({ lang, setLang, variant = 'hero' }: MinimalNavProps) {
  const [scrolled, setScrolled] = useState(variant === 'solid')
  const [searchOpen, setSearchOpen] = useState(false)
  const [contributeOpen, setContributeOpen] = useState(false)
  const contributeRef = useRef<HTMLDivElement>(null)
  const isSolid = variant === 'solid' || scrolled
  const { reader, enabled: readerAuthEnabled, openSignIn } = useReaderAuth()

  useEffect(() => {
    if (variant === 'solid') {
      setScrolled(true)
      return
    }
    const handleScroll = () => {
      setScrolled(window.scrollY > 40)
      setContributeOpen(false)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [variant])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!contributeRef.current?.contains(event.target as Node)) {
        setContributeOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const navLinks = getPrimaryNavLinks(lang)

  const contributeLinks = [
    {
      label: lang === 'bg' ? 'Пишете за нас' : 'Write for Us',
      href: '/write-for-us',
      icon: PenLine,
    },
    {
      label: lang === 'bg' ? 'Автори' : 'Authors',
      href: '/authors',
      icon: Users,
    },
    {
      label: lang === 'bg' ? 'Подкрепете ни' : 'Support Us',
      href: '/support',
      icon: Heart,
    },
    {
      label: lang === 'bg' ? 'Партньорства' : 'Partnerships',
      href: '/partnerships',
      icon: Handshake,
    },
  ]

  const navItemClass = isSolid
    ? 'text-[#1A1A1A]/80 hover:text-[#0C2686]'
    : 'text-white/90 hover:text-white'

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-40 transition-all duration-500',
          isSolid
            ? 'bg-[#FDFBF7]/90 backdrop-blur-md py-4 border-b border-[#EAE6DF] shadow-xs'
            : 'bg-transparent py-6 md:py-8'
        )}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="shrink-0 transition-opacity hover:opacity-90"
          >
            <Logo
              className={cn(
                'h-6 md:h-7 transition-[filter] duration-500',
                !isSolid && 'brightness-0 invert'
              )}
              showSlogan={false}
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-7 xl:gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'text-xs uppercase tracking-[0.25em] transition-colors font-sans duration-300',
                  navItemClass
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={() => setSearchOpen(true)}
              className={cn(
                'flex items-center gap-2 text-xs uppercase tracking-[0.2em] transition-colors py-1 px-2.5 rounded-full duration-300',
                isSolid
                  ? 'text-[#1A1A1A]/70 hover:text-[#0C2686] hover:bg-black/5'
                  : 'text-white/85 hover:text-white hover:bg-white/10'
              )}
              aria-label="Search"
            >
              <Search className="size-3.5 stroke-[1.5]" />
              <span className="hidden sm:inline font-sans">{lang === 'bg' ? 'Търсене' : 'Search'}</span>
            </button>

            {/* Contribute dropdown */}
            <div ref={contributeRef} className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setContributeOpen((open) => !open)}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-sans uppercase tracking-[0.18em] font-medium transition-all duration-300',
                  isSolid
                    ? 'bg-[#0C2686] text-white hover:bg-[#1A1A1A]'
                    : 'bg-white text-[#1A1A1A] hover:bg-white/90',
                )}
                aria-expanded={contributeOpen}
                aria-haspopup="menu"
              >
                <Heart className="size-3 fill-current" />
                <span>{lang === 'bg' ? 'Присъединете се' : 'Contribute'}</span>
                <ChevronDown
                  className={cn(
                    'size-3.5 transition-transform duration-300',
                    contributeOpen && 'rotate-180',
                  )}
                />
              </button>

              <AnimatePresence>
                {contributeOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    role="menu"
                    className="absolute right-0 z-50 mt-3 w-[240px] origin-top-right overflow-hidden rounded-[4px] border border-[#EAE6DF] bg-[#FDFBF7] shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
                  >
                    <div className="border-b border-[#EAE6DF] px-4 py-3">
                      <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#1A1A1A]/40">
                        {lang === 'bg' ? 'Присъединете се' : 'Get involved'}
                      </p>
                    </div>
                    <div className="py-1.5">
                      {contributeLinks.map((item, index) => {
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            role="menuitem"
                            onClick={() => setContributeOpen(false)}
                            className={cn(
                              'group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-black/[0.03]',
                              index < contributeLinks.length - 1 && 'border-b border-[#EAE6DF]/80',
                            )}
                          >
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-[3px] border border-[#EAE6DF] bg-white transition-transform duration-300 group-hover:translate-x-0.5">
                              <Icon className="size-3.5 stroke-[1.5] text-[#1A1A1A]/55" />
                            </span>
                            <span className="font-sans text-[11px] uppercase tracking-[0.16em] text-[#1A1A1A]/75 transition-colors group-hover:text-[#1A1A1A]">
                              {item.label}
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {readerAuthEnabled && (
              reader ? (
                <Link
                  to="/me"
                  className={cn(
                    'hidden items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-sans uppercase tracking-[0.16em] transition-colors sm:inline-flex',
                    isSolid
                      ? 'text-[#1A1A1A]/70 hover:text-[#0C2686] hover:bg-black/5'
                      : 'text-white/85 hover:text-white hover:bg-white/10',
                  )}
                  aria-label={lang === 'bg' ? 'Запазени' : 'Saved'}
                >
                  <Bookmark className="size-3.5 stroke-[1.5]" />
                  <span className="hidden lg:inline">
                    {lang === 'bg' ? 'Запазени' : 'Saved'}
                  </span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => openSignIn({ returnUrl: '/me' })}
                  className={cn(
                    'hidden cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-sans uppercase tracking-[0.16em] transition-colors sm:inline-flex',
                    isSolid
                      ? 'text-[#1A1A1A]/70 hover:text-[#0C2686] hover:bg-black/5'
                      : 'text-white/85 hover:text-white hover:bg-white/10',
                  )}
                >
                  {lang === 'bg' ? 'Вход' : 'Sign in'}
                </button>
              )
            )}

            <button
              onClick={() => setLang(lang === 'bg' ? 'en' : 'bg')}
              className={cn(
                'flex items-center gap-1 text-[11px] font-sans uppercase tracking-widest transition-colors px-2.5 py-1 rounded-full duration-300',
                isSolid
                  ? 'text-[#1A1A1A]/60 hover:text-[#0C2686] border border-[#1A1A1A]/20 hover:border-[#0C2686]'
                  : 'text-white/80 hover:text-white border border-white/35 hover:border-white/70'
              )}
            >
              <Globe className="size-3 stroke-[1.5]" />
              <span>{lang.toUpperCase()}</span>
            </button>

            <MobileNavMenu
              lang={lang}
              setLang={setLang}
              onSearch={() => setSearchOpen(true)}
              className={isSolid ? 'text-journal-ink' : 'text-white'}
            />
          </div>
        </div>
      </header>

      <AnimatePresence>
        {searchOpen ? (
          <JournalSearchOverlay lang={lang} onClose={() => setSearchOpen(false)} />
        ) : null}
      </AnimatePresence>
    </>
  )
}
