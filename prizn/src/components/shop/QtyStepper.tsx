import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

type QtyStepperProps = {
  value: number
  min?: number
  max: number
  onChange: (next: number) => void
  disabled?: boolean
  className?: string
  /** Accessible label for the quantity value */
  label?: string
}

export function QtyStepper({
  value,
  min = 1,
  max,
  onChange,
  disabled,
  className,
  label,
}: QtyStepperProps) {
  const safeMax = Math.max(min, max)
  const decrease = () => onChange(Math.max(min, value - 1))
  const increase = () => onChange(Math.min(safeMax, value + 1))

  return (
    <div
      className={cn(
        'inline-flex items-center overflow-hidden rounded-full border border-[#EAE6DF] bg-white',
        disabled && 'opacity-40',
        className,
      )}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={decrease}
        disabled={disabled || value <= min}
        className="flex size-9 items-center justify-center text-[#1A1A1A] transition-colors hover:bg-[#F5F2EC] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="−"
      >
        <Minus className="size-3.5 stroke-[1.75]" />
      </button>
      <span className="min-w-8 px-1 text-center font-sans text-sm tabular-nums text-[#1A1A1A]">
        {value}
      </span>
      <button
        type="button"
        onClick={increase}
        disabled={disabled || value >= safeMax}
        className="flex size-9 items-center justify-center text-[#1A1A1A] transition-colors hover:bg-[#F5F2EC] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="+"
      >
        <Plus className="size-3.5 stroke-[1.75]" />
      </button>
    </div>
  )
}
