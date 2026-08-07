import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AlertVariant = 'success' | 'error' | 'info'

export type AlertProps = {
  open: boolean
  variant?: AlertVariant
  title?: string
  message: string
  onClose?: () => void
  /** Auto-dismiss after ms (0 = stay open). Default 4500. */
  duration?: number
  /** fixed toast vs inline banner */
  mode?: 'toast' | 'inline'
  className?: string
}

const variantStyles: Record<
  AlertVariant,
  { wrap: string; icon: string; Icon: typeof CheckCircle2 }
> = {
  success: {
    wrap: 'border-[#0C2686]/20 bg-[#0C2686]/5 text-[#0C2686]',
    icon: 'bg-[#0C2686] text-white',
    Icon: CheckCircle2,
  },
  error: {
    wrap: 'border-rose-200 bg-rose-50 text-rose-900',
    icon: 'bg-rose-600 text-white',
    Icon: AlertCircle,
  },
  info: {
    wrap: 'border-amber-200 bg-amber-50 text-amber-950',
    icon: 'bg-amber-600 text-white',
    Icon: Info,
  },
}

export function Alert({
  open,
  variant = 'info',
  title,
  message,
  onClose,
  duration = 4500,
  mode = 'toast',
  className,
}: AlertProps) {
  useEffect(() => {
    if (!open || !onClose || duration <= 0) return
    const timer = window.setTimeout(onClose, duration)
    return () => window.clearTimeout(timer)
  }, [open, onClose, duration])

  const styles = variantStyles[variant]
  const Icon = styles.Icon

  const body = (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-lg backdrop-blur-sm',
        styles.wrap,
        className,
      )}
    >
      <div
        className={cn(
          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
          styles.icon,
        )}
      >
        <Icon className="size-4" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        {title && (
          <p className="font-sans text-sm font-semibold tracking-tight">{title}</p>
        )}
        <p
          className={cn(
            'font-sans text-sm font-light leading-relaxed',
            title ? 'mt-0.5 opacity-90' : '',
          )}
        >
          {message}
        </p>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="mt-0.5 rounded-lg p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )

  if (mode === 'inline') {
    return (
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            {body}
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4 sm:inset-x-auto sm:bottom-8 sm:right-8 sm:justify-end"
        >
          <div className="pointer-events-auto w-full max-w-md">{body}</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
