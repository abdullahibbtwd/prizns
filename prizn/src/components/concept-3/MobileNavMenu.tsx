import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Globe, Menu, Search, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  getContributeNavLinks,
  getFooterSecondaryLinks,
  getPrimaryNavLinks,
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

  const groups = [
    {
      label: lang === 'bg' ? 'Разкази' : 'Stories',
      links: getPrimaryNavLinks(lang),
    },
    {
      label: lang === 'bg' ? 'Журналът' : 'The journal',
      links: getFooterSecondaryLinks(lang),
    },
    {
      label: lang === 'bg' ? 'Присъединете се' : 'Get involved',
      links: getContributeNavLinks(lang),
    },
  ]

  const close = () => setOpen(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'p-1 text-journal-ink transition-colors duration-300 lg:hidden',
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
                'fixed inset-x-0 z-30 max-h-[calc(100svh-70px)] overflow-y-auto border-b border-[#EAE6DF] bg-[#FDFBF7] px-8 py-8 shadow-xl lg:hidden',
                panelOffsetClassName,
              )}
            >
              <div className="mx-auto flex max-w-sm flex-col gap-8">
                {groups.map((group) => (
                  <div key={group.label} className="flex flex-col gap-3 text-center">
                    <p className="font-sans text-[10px] uppercase tracking-[0.28em] text-[#1A1A1A]/40">
                      {group.label}
                    </p>
                    {group.links.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={close}
                        className="font-heading text-xl tracking-widest text-journal-ink hover:text-journal-navy"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                ))}

                <div className="flex flex-col gap-3 border-t border-[#EAE6DF] pt-5 text-center">
                  <Link
                    to="/why-prizni"
                    onClick={close}
                    className="font-heading text-lg tracking-widest text-journal-ink hover:text-journal-navy"
                  >
                    {lang === 'bg' ? 'Защо Prizni' : 'Why Prizni'}
                  </Link>
                  {readerAuthEnabled ? (
                    reader ? (
                      <Link
                        to="/me"
                        onClick={close}
                        className="font-heading text-lg tracking-widest text-journal-ink hover:text-journal-navy"
                      >
                        {lang === 'bg' ? 'Запазени' : 'Saved'}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          close()
                          openSignIn({ returnUrl: '/me' })
                        }}
                        className="cursor-pointer font-heading text-lg tracking-widest text-journal-ink hover:text-journal-navy"
                      >
                        {lang === 'bg' ? 'Вход' : 'Sign in'}
                      </button>
                    )
                  ) : null}
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
