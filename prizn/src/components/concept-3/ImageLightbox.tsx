import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type LightboxSlide = {
  url: string
  alt: string
  caption?: string
}

export function ImageLightbox({
  open,
  slides,
  index,
  onIndexChange,
  onClose,
}: {
  open: boolean
  slides: LightboxSlide[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const total = slides.length
  const current = slides[index] ?? slides[0]
  const hasMany = total > 1

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (!hasMany) return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        onIndexChange(index <= 0 ? total - 1 : index - 1)
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        onIndexChange(index >= total - 1 ? 0 : index + 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, hasMany, index, total, onClose, onIndexChange])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && current ? (
        <motion.div
          key="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={current.alt || t('viewFullPhoto')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0B0B0B]/92 p-4 backdrop-blur-sm print:hidden"
          onClick={onClose}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex size-11 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
            aria-label={t('closePhoto')}
          >
            <X className="size-5 stroke-[1.5]" />
          </button>

          {hasMany ? (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onIndexChange(index <= 0 ? total - 1 : index - 1)
                }}
                className="absolute left-3 top-1/2 z-10 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 md:left-6"
                aria-label={t('prevPhoto')}
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onIndexChange(index >= total - 1 ? 0 : index + 1)
                }}
                className="absolute right-3 top-1/2 z-10 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 md:right-6"
                aria-label={t('nextPhoto')}
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          ) : null}

          <figure
            className="relative flex max-h-[92svh] max-w-[min(92vw,1200px)] flex-col items-center"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={current.url}
              alt={current.alt}
              className="max-h-[82svh] w-auto max-w-full object-contain shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
            />
            {(current.caption || hasMany) && (
              <figcaption className="mt-4 max-w-2xl text-center font-sans text-[11px] uppercase tracking-[0.18em] text-white/70">
                {current.caption}
                {hasMany ? (
                  <span className={cn(current.caption && 'ml-3 text-white/40')}>
                    {t('photoOf', { current: index + 1, total })}
                  </span>
                ) : null}
              </figcaption>
            )}
          </figure>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
