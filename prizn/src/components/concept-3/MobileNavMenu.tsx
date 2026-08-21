import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Globe, Menu, Search, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  getFooterSecondaryLinks,
  getPrimaryNavLinks,
  getTertiaryNavLinks,
} from '@/data/concept-3/nav'
import { useReaderAuth } from '@/lib/reader-auth'

interface MobileNavMenuProps {
  lang: 'bg' | 'en'
  setLang: (lang: 'bg' | 'en') => void
  /** Opens the shared search overlay when provided (listing nav). */
  onSearch?: () => void
  /** Distance from the top of the viewport so the drawer sits under the current header. */
  panelOffsetClassName?: string
  className?: string
}

export function MobileNavMenu({
  lang,
  setLang,
  onSearch,
  panelOffsetClassName = 'top-[70px]',
  className,
}: MobileNavMenuProps) {
  const [open, setOpen] = useState(false)
  const { reader, enabled: readerAuthEnabled, openSignIn } = useReaderAuth()

  const mobileLinks = [
    ...getPrimaryNavLinks(lang),
    ...getFooterSecondaryLinks(lang),
    ...getTertiaryNavLinks(lang),
    {
      label: lang === 'bg' ? 'Пишете за нас' : 'Write for Us',
      to: '/write-for-us',
    },
    {
      label: lang === 'bg' ? 'Подкрепете ни' : 'Support Us',
      to: '/support',
    },
    {
      label: lang === 'bg' ? 'Партньорства' : 'Partnerships',
      to: '/partnerships',
    },
    { label: lang === 'bg' ? 'Защо Prizni' : 'Why Prizni', to: '/why-prizni' },
    ...(readerAuthEnabled
      ? [
          {
            label: reader
              ? lang === 'bg'
                ? 'Запазени'
                : 'Saved'
              : lang === 'bg'
                ? 'Вход'
                : 'Sign in',
            to: reader ? '/me' : '#signin',
          },
        ]
      : []),
  ]

  const close = () => setOpen(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'md:hidden p-1 transition-colors duration-300 text-journal-ink',
          className,
        )}
        aria-label="Toggle menu"
        aria-expanded={open}
      >
        {open ? (
          <X className="size-6 stroke-[1.5]" />
        ) : (
          <Menu className="size-6 stroke-[1.5]" />
        )}
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                'fixed inset-x-0 z-30 max-h-[calc(100svh-70px)] overflow-y-auto bg-[#FDFBF7] border-b border-[#EAE6DF] px-8 py-8 shadow-xl md:hidden',
                panelOffsetClassName,
              )}
            >
              <div className="flex flex-col gap-5 text-center">
                {mobileLinks.map((link) =>
                  link.to === '#signin' ? (
                    <button
                      key={link.to}
                      type="button"
                      onClick={() => {
                        close()
                        openSignIn({ returnUrl: '/me' })
                      }}
                      className="cursor-pointer font-heading text-xl tracking-widest text-journal-ink hover:text-journal-navy"
                    >
                      {link.label}
                    </button>
                  ) : (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={close}
                      className="font-heading text-xl tracking-widest text-journal-ink hover:text-journal-navy"
                    >
                      {link.label}
                    </Link>
                  ),
                )}

                <div className="mt-2 flex flex-col gap-3 border-t border-[#EAE6DF] pt-5">
                  {onSearch ? (
                    <button
                      type="button"
                      onClick={() => {
                        close()
                        onSearch()
                      }}
                      className="inline-flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em] text-[#1A1A1A]/70"
                    >
                      <Search className="size-3.5" />
                      {lang === 'bg' ? 'Търсене' : 'Search'}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setLang(lang === 'bg' ? 'en' : 'bg')}
                    className="inline-flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em] text-[#1A1A1A]/70"
                  >
                    <Globe className="size-3.5" />
                    {lang === 'bg' ? 'Език: BG' : 'Language: EN'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
