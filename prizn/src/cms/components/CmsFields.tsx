import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CmsLabel({
  children,
  htmlFor,
  className,
}: {
  children: ReactNode
  htmlFor?: string
  className?: string
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        'mb-1.5 block font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-stone-500',
        className,
      )}
    >
      {children}
    </label>
  )
}

export function CmsField({
  label,
  htmlFor,
  children,
  className,
}: {
  label?: ReactNode
  htmlFor?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? <CmsLabel htmlFor={htmlFor}>{label}</CmsLabel> : null}
      {children}
    </div>
  )
}

const controlClass =
  'w-full rounded-xl border border-[#E8E4DC] bg-white px-3.5 py-2.5 font-sans text-sm text-stone-900 shadow-2xs outline-none transition-all placeholder:text-stone-400 hover:border-[#0C2686]/25 focus:border-[#0C2686] focus:ring-2 focus:ring-[#0C2686]/10 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:opacity-60'

export const CmsInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function CmsInput({ className, ...props }, ref) {
  return (
    <input ref={ref} {...props} className={cn(controlClass, className)} />
  )
})

export const CmsTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function CmsTextarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      {...props}
      className={cn(controlClass, 'min-h-[96px] resize-y leading-relaxed', className)}
    />
  )
})

type CmsChoiceProps = {
  checked: boolean
  onChange: () => void
  label: ReactNode
  name?: string
  disabled?: boolean
  className?: string
  description?: ReactNode
}

function ChoiceMark({
  checked,
  shape,
}: {
  checked: boolean
  shape: 'radio' | 'checkbox'
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'mt-0.5 flex size-4 shrink-0 items-center justify-center border transition-all',
        shape === 'radio' ? 'rounded-full' : 'rounded-[4px]',
        checked
          ? 'border-[#0C2686] bg-[#0C2686] text-white'
          : 'border-stone-300 bg-white group-hover:border-[#0C2686]/50',
      )}
    >
      {checked ? (
        shape === 'radio' ? (
          <span className="size-1.5 rounded-full bg-white" />
        ) : (
          <Check className="size-3 stroke-[2.5]" />
        )
      ) : null}
    </span>
  )
}

export function CmsRadio({
  checked,
  onChange,
  label,
  name,
  disabled,
  className,
  description,
}: CmsChoiceProps) {
  return (
    <label
      className={cn(
        'group flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-all',
        checked
          ? 'border-[#0C2686]/35 bg-[#0C2686]/[0.04]'
          : 'border-[#E8E4DC] bg-white hover:border-[#0C2686]/25',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
      />
      <ChoiceMark checked={checked} shape="radio" />
      <span className="min-w-0 flex-1">
        <span className="block font-sans text-sm font-medium text-stone-800">
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block font-sans text-xs font-light text-stone-500">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  )
}

export function CmsCheckbox({
  checked,
  onChange,
  label,
  name,
  disabled,
  className,
  description,
}: CmsChoiceProps) {
  return (
    <label
      className={cn(
        'group flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-all',
        checked
          ? 'border-[#0C2686]/35 bg-[#0C2686]/[0.04]'
          : 'border-[#E8E4DC] bg-white hover:border-[#0C2686]/25',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <input
        type="checkbox"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
      />
      <ChoiceMark checked={checked} shape="checkbox" />
      <span className="min-w-0 flex-1">
        <span className="block font-sans text-sm font-medium text-stone-800">
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block font-sans text-xs font-light text-stone-500">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  )
}

export function CmsRadioGroup({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('flex flex-col gap-2', className)}>{children}</div>
}
