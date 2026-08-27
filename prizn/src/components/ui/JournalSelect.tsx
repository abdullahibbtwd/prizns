import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface JournalSelectOption {
  value: string
  label: string
  indent?: boolean
}

interface JournalSelectProps {
  name: string
  options: JournalSelectOption[]
  placeholder?: string
  label?: string
  ariaLabel?: string
  required?: boolean
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  className?: string
  /** underline = public journal; boxed = CMS dense forms */
  variant?: 'underline' | 'boxed'
  /** sm = compact type chip used in the story body editor */
  size?: 'md' | 'sm'
}

type MenuCoords = {
  left: number
  width: number
  top?: number
  bottom?: number
  maxHeight: number
}

export function JournalSelect({
  name,
  options,
  placeholder = 'Select…',
  label,
  ariaLabel,
  required = false,
  value: controlledValue,
  defaultValue = '',
  onChange,
  className,
  variant = 'underline',
  size = 'md',
}: JournalSelectProps) {
  const [open, setOpen] = useState(false)
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [coords, setCoords] = useState<MenuCoords | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : internalValue
  const selected = options.find((option) => option.value === value)
  const isCompact = size === 'sm'
  const minMenu = isCompact ? 140 : 220
  const minWidth = isCompact ? 148 : 180

  const updatePosition = () => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const gap = 8
    const spaceBelow = window.innerHeight - rect.bottom - gap
    const spaceAbove = rect.top - gap
    const openUp = spaceBelow < minMenu && spaceAbove > spaceBelow
    const maxHeight = Math.max(
      160,
      Math.min(320, openUp ? spaceAbove : spaceBelow),
    )

    setCoords({
      left: rect.left,
      width: Math.max(rect.width, minWidth),
      maxHeight,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + gap }
        : { top: rect.bottom + gap }),
    })
  }

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null)
      return
    }
    updatePosition()
    const onReposition = () => updatePosition()
    window.addEventListener('resize', onReposition)
    // Capture scroll from nested CMS panes too
    window.addEventListener('scroll', onReposition, true)
    return () => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target)) return
      if (listRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const openMenu = () => {
    const trigger = triggerRef.current
    if (trigger) {
      const rect = trigger.getBoundingClientRect()
      const gap = 8
      const spaceBelow = window.innerHeight - rect.bottom - gap
      const spaceAbove = rect.top - gap
      const openUp = spaceBelow < minMenu && spaceAbove > spaceBelow
      const maxHeight = Math.max(
        160,
        Math.min(320, openUp ? spaceAbove : spaceBelow),
      )
      setCoords({
        left: rect.left,
        width: Math.max(rect.width, minWidth),
        maxHeight,
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + gap }
          : { top: rect.bottom + gap }),
      })
    }
    setOpen(true)
  }

  const selectValue = (next: string) => {
    if (!isControlled) setInternalValue(next)
    onChange?.(next)
    setOpen(false)
  }

  const menu =
    open && coords
      ? createPortal(
          <AnimatePresence>
            <motion.div
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label={ariaLabel ?? label ?? placeholder}
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                left: coords.left,
                width: coords.width,
                top: coords.top,
                bottom: coords.bottom,
                zIndex: 9999,
                maxHeight: coords.maxHeight,
              }}
              className="origin-top overflow-hidden rounded-[4px] border border-[#EAE6DF] bg-[#FDFBF7] shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
            >
              {label && !isCompact && (
                <div className="border-b border-[#EAE6DF] px-4 py-3">
                  <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#1A1A1A]/40">
                    {label}
                  </p>
                </div>
              )}
              <div
                className="overflow-y-auto py-1.5"
                style={{ maxHeight: coords.maxHeight - (label ? 48 : 0) }}
              >
                {options.map((option, index) => {
                  const active = option.value === value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => selectValue(option.value)}
                      className={cn(
                        'group flex w-full cursor-pointer items-center justify-between gap-3 text-left transition-colors hover:bg-black/[0.03]',
                        isCompact ? 'px-3 py-2' : 'px-4 py-3',
                        option.indent && (isCompact ? 'pl-6' : 'pl-8'),
                        index < options.length - 1 &&
                          'border-b border-[#EAE6DF]/80',
                      )}
                    >
                      <span
                        className={cn(
                          'font-sans uppercase tracking-[0.16em] transition-colors',
                          isCompact ? 'text-[10px]' : 'text-[11px]',
                          active
                            ? 'text-[#1A1A1A]'
                            : 'text-[#1A1A1A]/70 group-hover:text-[#1A1A1A]',
                        )}
                      >
                        {option.label}
                      </span>
                      <span
                        className={cn(
                          'flex shrink-0 items-center justify-center rounded-[3px] border transition-all',
                          isCompact ? 'size-5' : 'size-7',
                          active
                            ? 'border-[#1A1A1A]/20 bg-white'
                            : 'border-transparent group-hover:border-[#EAE6DF] group-hover:bg-white',
                        )}
                      >
                        {active && (
                          <Check className="size-3.5 stroke-[1.5] text-[#1A1A1A]/70" />
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </AnimatePresence>,
          document.body,
        )
      : null

  return (
    <div ref={rootRef} className={cn('relative z-10', className)}>
      <input
        type="text"
        name={name}
        value={value}
        required={required}
        tabIndex={-1}
        aria-hidden
        readOnly
        className="pointer-events-none absolute h-0 w-0 opacity-0"
      />

      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (open) setOpen(false)
          else openMenu()
        }}
        className={cn(
          'flex cursor-pointer items-center text-left font-sans outline-none transition-all',
          isCompact
            ? cn(
                'w-auto max-w-[11rem] gap-1 rounded-md bg-transparent px-0 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0C2686]/70 hover:text-[#0C2686]',
                open && 'text-[#0C2686]',
              )
            : cn(
                'w-full justify-between gap-3 text-sm',
                variant === 'boxed'
                  ? cn(
                      'rounded-xl border bg-white px-3.5 py-2.5 shadow-2xs',
                      open
                        ? 'border-[#0C2686] ring-2 ring-[#0C2686]/10'
                        : 'border-[#E8E4DC] hover:border-[#0C2686]/25',
                      selected ? 'text-stone-900' : 'text-stone-400',
                    )
                  : cn(
                      'border-b bg-transparent py-3',
                      open
                        ? 'border-[#0C2686]'
                        : 'border-[#1A1A1A]/15 hover:border-[#1A1A1A]/35',
                      selected ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]/30',
                    ),
              ),
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown
          className={cn(
            'shrink-0 stroke-[1.5] transition-transform duration-300',
            isCompact ? 'size-3 text-[#0C2686]/50' : 'size-4',
            !isCompact && (variant === 'boxed' ? 'text-stone-400' : 'text-[#1A1A1A]/45'),
            open && 'rotate-180',
          )}
        />
      </button>

      {menu}
    </div>
  )
}
