import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface JournalSelectOption {
  value: string
  label: string
}

interface JournalSelectProps {
  name: string
  options: JournalSelectOption[]
  placeholder?: string
  label?: string
  required?: boolean
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  className?: string
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
  required = false,
  value: controlledValue,
  defaultValue = '',
  onChange,
  className,
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

  const updatePosition = () => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const gap = 8
    const minMenu = 220
    const spaceBelow = window.innerHeight - rect.bottom - gap
    const spaceAbove = rect.top - gap
    const openUp = spaceBelow < minMenu && spaceAbove > spaceBelow
    const maxHeight = Math.max(
      160,
      Math.min(320, openUp ? spaceAbove : spaceBelow),
    )

    setCoords({
      left: rect.left,
      width: Math.max(rect.width, 180),
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
      const minMenu = 220
      const spaceBelow = window.innerHeight - rect.bottom - gap
      const spaceAbove = rect.top - gap
      const openUp = spaceBelow < minMenu && spaceAbove > spaceBelow
      const maxHeight = Math.max(
        160,
        Math.min(320, openUp ? spaceAbove : spaceBelow),
      )
      setCoords({
        left: rect.left,
        width: Math.max(rect.width, 180),
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
              aria-label={label ?? placeholder}
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
              {label && (
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
                        'group flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.03]',
                        index < options.length - 1 &&
                          'border-b border-[#EAE6DF]/80',
                      )}
                    >
                      <span
                        className={cn(
                          'font-sans text-[11px] uppercase tracking-[0.16em] transition-colors',
                          active
                            ? 'text-[#1A1A1A]'
                            : 'text-[#1A1A1A]/70 group-hover:text-[#1A1A1A]',
                        )}
                      >
                        {option.label}
                      </span>
                      <span
                        className={cn(
                          'flex size-7 shrink-0 items-center justify-center rounded-[3px] border transition-all',
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
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (open) setOpen(false)
          else openMenu()
        }}
        className={cn(
          'flex w-full cursor-pointer items-center justify-between gap-3 border-b bg-transparent py-3 text-left font-sans text-sm outline-none transition-colors',
          open
            ? 'border-[#0C2686]'
            : 'border-[#1A1A1A]/15 hover:border-[#1A1A1A]/35',
          selected ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]/30',
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 stroke-[1.5] text-[#1A1A1A]/45 transition-transform duration-300',
            open && 'rotate-180',
          )}
        />
      </button>

      {menu}
    </div>
  )
}
