import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ViewAllLinkProps {
  to: string
  lang: 'bg' | 'en'
  className?: string
}

export function ViewAllLink({ to, lang, className }: ViewAllLinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex items-center gap-1.5 font-sans text-xs font-medium uppercase tracking-[0.2em] text-[#0C2686] transition-opacity hover:opacity-70',
        className,
      )}
    >
      {lang === 'bg' ? 'Вижте всички' : 'View all'}
      <ArrowRight className="size-3.5" />
    </Link>
  )
}
