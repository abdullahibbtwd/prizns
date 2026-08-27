import { Link } from 'react-router-dom'
import type { JournalLang } from '@/components/concept-3/JournalShell'
import { LANDING_PATH, type LandingKey } from '@/lib/category-section'
import { landingCategoryChoices } from '@/lib/category-tree'
import { usePublicCategories } from '@/lib/public-content'
import { cn } from '@/lib/utils'

export function LandingCategoryChips({
  lang,
  landing,
  className,
  align = 'start',
}: {
  lang: JournalLang
  landing: LandingKey
  className?: string
  align?: 'start' | 'center'
}) {
  const { data } = usePublicCategories()
  const items = landingCategoryChoices(data ?? [], landing, lang)
  if (items.length === 0) return null

  const path = LANDING_PATH[landing]

  return (
    <div
      className={cn(
        'flex flex-wrap gap-2',
        align === 'center' && 'justify-center',
        className,
      )}
    >
      {items.map((item) => (
        <Link
          key={item.slug}
          to={`${path}?category=${encodeURIComponent(item.slug)}`}
          className="rounded-full border border-[#EAE6DF] bg-white px-3 py-1.5 font-sans text-[11px] uppercase tracking-[0.16em] text-[#1A1A1A]/70 transition-colors hover:border-[#0C2686]/40 hover:text-[#0C2686]"
        >
          {item.label}
        </Link>
      ))}
    </div>
  )
}
