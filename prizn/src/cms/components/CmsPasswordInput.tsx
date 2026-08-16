import { Eye, EyeOff } from 'lucide-react'
import { CmsInput } from '@/cms/components/CmsFields'

export function CmsPasswordInput({
  id,
  value,
  onChange,
  visible,
  onToggleVisible,
  showLabel,
  hideLabel,
  required = false,
  minLength,
  autoComplete = 'new-password',
}: {
  id: string
  value: string
  onChange: (value: string) => void
  visible: boolean
  onToggleVisible: () => void
  showLabel: string
  hideLabel: string
  required?: boolean
  minLength?: number
  autoComplete?: string
}) {
  return (
    <div className="relative">
      <CmsInput
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        minLength={minLength}
        required={required}
        className="pr-11"
      />
      <button
        type="button"
        onClick={onToggleVisible}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-stone-400 transition hover:text-stone-700"
        aria-label={visible ? hideLabel : showLabel}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}
