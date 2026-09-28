import { cn } from '@/lib/utils'

type GuestAuthorBadgeProps = {
  lang: 'bg' | 'en'
  className?: string
  tone?: 'onDark' | 'onLight'
}

export function guestAuthorLabel(lang: 'bg' | 'en'): string {
  return lang === 'bg' ? 'Гост автор' : 'Guest author'
}

/** True when an author's role text already says "guest author" (the default for guests). */
export function isGuestRoleText(role: string | null | undefined): boolean {
  const value = (role ?? '').trim().toLowerCase()
  return value === 'гост автор' || value === 'guest author'
}

export function GuestAuthorBadge({
  lang,
  className,
  tone = 'onLight',
}: GuestAuthorBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-full px-2.5 py-1 font-sans text-[10px] font-semibold uppercase tracking-[0.16em]',
        tone === 'onDark' &&
          'bg-white/90 text-[#0C2686] shadow-sm backdrop-blur-sm',
        tone === 'onLight' &&
          'border border-[#0C2686]/25 bg-[#0C2686]/5 text-[#0C2686]',
        className,
      )}
    >
      <span className="truncate">{guestAuthorLabel(lang)}</span>
    </span>
  )
}
