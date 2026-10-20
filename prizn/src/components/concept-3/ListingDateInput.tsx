import { useEffect, useId, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import type { JournalLang } from '@/components/concept-3/JournalShell'
import { cn } from '@/lib/utils'

const BG_MONTHS = [
  'януари',
  'февруари',
  'март',
  'април',
  'май',
  'юни',
  'юли',
  'август',
  'септември',
  'октомври',
  'ноември',
  'декември',
] as const

const EN_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

const BG_WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'нд'] as const
const EN_WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const

function parseIso(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function toIso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDisplay(value: string, lang: JournalLang): string {
  const date = parseIso(value)
  if (!date) return ''
  return new Intl.DateTimeFormat(lang === 'bg' ? 'bg-BG' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

/** Monday-first grid cells for a month view. */
function monthCells(view: Date): Array<Date | null> {
  const first = startOfMonth(view)
  const startPad = (first.getDay() + 6) % 7
  const daysInMonth = new Date(
    view.getFullYear(),
    view.getMonth() + 1,
    0,
  ).getDate()
  const cells: Array<Date | null> = []
  for (let i = 0; i < startPad; i += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(view.getFullYear(), view.getMonth(), day))
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function ListingDateInput({
  lang,
  name,
  label,
  value,
  min,
  max,
  onChange,
  className,
}: {
  lang: JournalLang
  name: string
  label: string
  value: string
  min?: string
  max?: string
  onChange: (value: string) => void
  className?: string
}) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const selected = parseIso(value)
  const [view, setView] = useState(() =>
    startOfMonth(selected ?? new Date()),
  )

  useEffect(() => {
    if (selected) setView(startOfMonth(selected))
  }, [value])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const months = lang === 'bg' ? BG_MONTHS : EN_MONTHS
  const weekdays = lang === 'bg' ? BG_WEEKDAYS : EN_WEEKDAYS
  const minDate = min ? parseIso(min) : null
  const maxDate = max ? parseIso(max) : null
  const display = formatDisplay(value, lang)
  const placeholder = lang === 'bg' ? 'Изберете дата' : 'Choose a date'

  const dayTime = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

  const isDisabled = (date: Date) => {
    const t = dayTime(date)
    if (minDate && t < dayTime(minDate)) return true
    if (maxDate && t > dayTime(maxDate)) return true
    return false
  }

  return (
    <div ref={rootRef} className={cn('relative min-w-0', className)}>
      <button
        type="button"
        id={id}
        name={name}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        lang={lang === 'bg' ? 'bg-BG' : 'en-GB'}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-md border border-[#EAE6DF] bg-white px-3 text-left font-sans text-sm text-[#1A1A1A] outline-none transition-colors hover:border-[#0C2686]/30 focus:border-[#0C2686]/40"
      >
        <span className={cn(!display && 'text-[#1A1A1A]/40')}>
          {display || placeholder}
        </span>
        <CalendarDays className="size-4 shrink-0 text-[#0C2686]/70" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={label}
          lang={lang === 'bg' ? 'bg-BG' : 'en-GB'}
          className="absolute left-0 top-[calc(100%+0.5rem)] z-40 w-[min(100%,20rem)] rounded-xl border border-[#EAE6DF] bg-white p-3 shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              className="inline-flex size-8 items-center justify-center rounded-md text-[#1A1A1A]/60 transition-colors hover:bg-[#F5F2EB] hover:text-[#1A1A1A]"
              aria-label={lang === 'bg' ? 'Предишен месец' : 'Previous month'}
              onClick={() => setView((current) => addMonths(current, -1))}
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="font-sans text-sm font-medium capitalize text-[#1A1A1A]">
              {months[view.getMonth()]} {view.getFullYear()}
            </p>
            <button
              type="button"
              className="inline-flex size-8 items-center justify-center rounded-md text-[#1A1A1A]/60 transition-colors hover:bg-[#F5F2EB] hover:text-[#1A1A1A]"
              aria-label={lang === 'bg' ? 'Следващ месец' : 'Next month'}
              onClick={() => setView((current) => addMonths(current, 1))}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {weekdays.map((day) => (
              <span
                key={day}
                className="py-1 text-center font-sans text-[10px] uppercase tracking-[0.12em] text-[#1A1A1A]/40"
              >
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthCells(view).map((date, index) => {
              if (!date) {
                return <span key={`empty-${index}`} className="size-9" />
              }
              const iso = toIso(date)
              const selectedDay = value === iso
              const disabled = isDisabled(date)
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(iso)
                    setOpen(false)
                  }}
                  className={cn(
                    'inline-flex size-9 items-center justify-center rounded-md font-sans text-sm transition-colors',
                    selectedDay
                      ? 'bg-[#0C2686] text-white'
                      : 'text-[#1A1A1A] hover:bg-[#F5F2EB]',
                    disabled && 'cursor-not-allowed opacity-30 hover:bg-transparent',
                  )}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#EAE6DF] pt-2">
            <button
              type="button"
              className="font-sans text-[11px] uppercase tracking-[0.16em] text-[#1A1A1A]/45 transition-colors hover:text-[#0C2686]"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
            >
              {lang === 'bg' ? 'Изчисти' : 'Clear'}
            </button>
            <button
              type="button"
              className="font-sans text-[11px] uppercase tracking-[0.16em] text-[#0C2686] transition-colors hover:opacity-80"
              onClick={() => {
                const today = toIso(new Date())
                if (minDate || maxDate) {
                  const todayDate = parseIso(today)
                  if (todayDate && isDisabled(todayDate)) {
                    setOpen(false)
                    return
                  }
                }
                onChange(today)
                setOpen(false)
              }}
            >
              {lang === 'bg' ? 'Днес' : 'Today'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
