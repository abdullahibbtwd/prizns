import { Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

type SeriesMeta = {
  title: string
  titleBg: string
  episodeNumber: number
}

type EpisodeBadgeProps = {
  lang: 'bg' | 'en'
  series: SeriesMeta
  className?: string
  tone?: 'onDark' | 'onLight'
}

export function episodeLabel(lang: 'bg' | 'en', series: SeriesMeta): string {
  const title = lang === 'bg' ? series.titleBg : series.title
  if (lang === 'bg') {
    return `Епизод ${series.episodeNumber} от „${title}“`
  }
  return `Episode ${series.episodeNumber} of ${title}`
}

export function EpisodeBadge({
  lang,
  series,
  className,
  tone = 'onDark',
}: EpisodeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 font-sans text-[10px] font-medium uppercase tracking-[0.16em]',
        tone === 'onDark'
          ? 'rounded-full bg-black/55 px-2.5 py-1 text-white backdrop-blur-sm'
          : 'text-[#0C2686]',
        className,
      )}
    >
      <Layers className="size-3 shrink-0 opacity-80" />
      <span className="truncate">{episodeLabel(lang, series)}</span>
    </span>
  )
}
