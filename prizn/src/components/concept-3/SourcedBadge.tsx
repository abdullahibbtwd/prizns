import { cn } from '@/lib/utils'

type SourcedBadgeProps = {
  lang: 'bg' | 'en'
  className?: string
  tone?: 'onDark' | 'onLight' | 'inline'
}

export function sourcedLabel(lang: 'bg' | 'en'): string {
  return lang === 'bg' ? 'Проверена' : 'Sourced'
}

export function SourcedBadge({
  lang,
  className,
  tone = 'onLight',
}: SourcedBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center font-sans text-[10px] font-semibold uppercase tracking-[0.16em]',
        tone === 'onDark' &&
          'rounded-full bg-[#0C2686]/95 px-2.5 py-1 text-white shadow-sm backdrop-blur-sm',
        tone === 'onLight' &&
          'rounded-full border border-[#0C2686]/25 bg-[#0C2686]/5 px-2.5 py-1 text-[#0C2686]',
        tone === 'inline' && 'text-[#0C2686]',
        className,
      )}
    >
      <span className="truncate">{sourcedLabel(lang)}</span>
    </span>
  )
}
