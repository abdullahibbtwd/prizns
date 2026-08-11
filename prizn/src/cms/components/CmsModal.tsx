import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type CmsModalProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  /** Wider panel when needed. Default `md`. */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClass = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
} as const

/**
 * Full-viewport CMS modal (portaled to `document.body`) so it sits above
 * tables, sticky headers, and overflow-clipped parents.
 */
export function CmsModal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  className,
}: CmsModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-stone-900/45 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cms-modal-title"
        className={cn(
          'relative z-10 flex max-h-[min(36rem,90vh)] w-full flex-col overflow-hidden rounded-2xl border border-[#E8E4DC] bg-[#FDFBF7] shadow-2xl',
          sizeClass[size],
          className,
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#E8E4DC] px-5 py-4">
          <div className="min-w-0">
            <h2
              id="cms-modal-title"
              className="font-heading text-xl text-stone-900"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-xs text-stone-500">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-[#E8E4DC] bg-white p-2 text-stone-600 transition hover:border-[#0C2686]/30 hover:text-[#0C2686]"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
