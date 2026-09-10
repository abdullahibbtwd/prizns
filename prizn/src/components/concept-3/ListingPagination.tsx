import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

function pageWindow(page: number, totalPages: number, maxButtons = 5) {
  if (totalPages <= maxButtons) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const half = Math.floor(maxButtons / 2)
  let start = Math.max(1, page - half)
  const end = Math.min(totalPages, start + maxButtons - 1)
  start = Math.max(1, end - maxButtons + 1)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

export function ListingPagination({
  lang,
  page,
  totalPages,
  onPage,
  tone = 'light',
}: {
  lang: 'bg' | 'en'
  page: number
  totalPages: number
  onPage: (page: number) => void
  tone?: 'light' | 'dark'
}) {
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [page])

  if (totalPages <= 1) return null

  const dark = tone === 'dark'
  const pages = pageWindow(page, totalPages)
  const prevLabel = lang === 'bg' ? 'Предишна' : 'Previous'
  const nextLabel = lang === 'bg' ? 'Следваща' : 'Next'

  return (
    <nav
      aria-label={lang === 'bg' ? 'Страници' : 'Pagination'}
      className="mt-14 flex flex-col items-center gap-4"
    >
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-sans text-[11px] uppercase tracking-[0.18em] transition-colors disabled:cursor-not-allowed disabled:opacity-35',
            dark
              ? 'border border-white/15 text-white/80 hover:bg-white/10'
              : 'border border-[#EAE6DF] text-[#1A1A1A]/70 hover:border-[#0C2686]/40 hover:text-[#0C2686]',
          )}
        >
          <ChevronLeft className="size-3.5" />
          {prevLabel}
        </button>

        {pages.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPage(n)}
            aria-current={n === page ? 'page' : undefined}
            className={cn(
              'min-w-10 rounded-full px-3 py-2 font-sans text-xs transition-colors',
              n === page
                ? dark
                  ? 'bg-white text-[#1A1A1A]'
                  : 'bg-[#0C2686] text-white'
                : dark
                  ? 'text-white/60 hover:bg-white/10 hover:text-white'
                  : 'text-[#1A1A1A]/55 hover:bg-[#0C2686]/8 hover:text-[#0C2686]',
            )}
          >
            {n}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-sans text-[11px] uppercase tracking-[0.18em] transition-colors disabled:cursor-not-allowed disabled:opacity-35',
            dark
              ? 'border border-white/15 text-white/80 hover:bg-white/10'
              : 'border border-[#EAE6DF] text-[#1A1A1A]/70 hover:border-[#0C2686]/40 hover:text-[#0C2686]',
          )}
        >
          {nextLabel}
          <ChevronRight className="size-3.5" />
        </button>
      </div>
      <p
        className={cn(
          'font-sans text-[11px] uppercase tracking-[0.18em]',
          dark ? 'text-white/40' : 'text-[#1A1A1A]/40',
        )}
      >
        {lang === 'bg'
          ? `Страница ${page} от ${totalPages}`
          : `Page ${page} of ${totalPages}`}
      </p>
    </nav>
  )
}
