import { cn } from '@/lib/utils'
import type { JournalLang } from '@/components/concept-3/JournalShell'

export function SectionLoading({
  lang,
  count = 3,
  cardClassName = 'aspect-[4/5]',
  gridClassName = 'grid grid-cols-1 gap-8 md:grid-cols-3',
  tone = 'light',
}: {
  lang: JournalLang
  count?: number
  cardClassName?: string
  gridClassName?: string
  tone?: 'light' | 'dark'
}) {
  return (
    <div>
      <p
        className={cn(
          'mb-6 font-sans text-xs uppercase tracking-[0.2em]',
          tone === 'dark' ? 'text-white/45' : 'text-[#1A1A1A]/45',
        )}
      >
        {lang === 'bg' ? 'Зареждане…' : 'Loading…'}
      </p>
      <div className={gridClassName}>
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            className={cn(
              'animate-pulse rounded-[16px]',
              tone === 'dark' ? 'bg-white/10' : 'bg-[#EAE6DF]',
              cardClassName,
            )}
          />
        ))}
      </div>
    </div>
  )
}
