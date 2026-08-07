import { cn } from '@/lib/utils'

type SponsoredBadgeProps = {
  lang: 'bg' | 'en'
  sponsorName?: string | null
  className?: string
  tone?: 'onDark' | 'onLight' | 'inline'
}

export function sponsoredLabel(
  lang: 'bg' | 'en',
  sponsorName?: string | null,
): string {
  const name = sponsorName?.trim()
  if (lang === 'bg') {
    return name ? `Спонсорирано от ${name}` : 'Спонсорирано'
  }
  return name ? `Sponsored by ${name}` : 'Sponsored'
}

export function SponsoredBadge({
  lang,
  sponsorName,
  className,
  tone = 'onDark',
}: SponsoredBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center font-sans text-[10px] font-semibold uppercase tracking-[0.16em]',
        tone === 'onDark' &&
          'rounded-full bg-amber-400/95 px-2.5 py-1 text-[#1A1A1A] shadow-sm backdrop-blur-sm',
        tone === 'onLight' &&
          'rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-1 text-amber-900',
        tone === 'inline' && 'text-amber-800',
        className,
      )}
    >
      <span className="truncate">{sponsoredLabel(lang, sponsorName)}</span>
    </span>
  )
}
