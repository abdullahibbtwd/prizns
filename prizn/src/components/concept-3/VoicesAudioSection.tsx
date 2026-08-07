import { Headphones, Radio } from 'lucide-react'
import { ViewAllLink } from '@/components/concept-3/ViewAllLink'
import {
  VoicesPlayerGrid,
  toVoiceItem,
} from '@/components/concept-3/VoicesPlayerGrid'
import { preferApi, usePublicArticles } from '@/lib/public-content'

interface VoicesAudioSectionProps {
  lang: 'bg' | 'en'
}

export function VoicesAudioSection({ lang }: VoicesAudioSectionProps) {
  const { data } = usePublicArticles('voices')
  const voices = preferApi(data?.map(toVoiceItem)).slice(0, 3)

  return (
    <section id="voices" className="relative overflow-hidden bg-[#1A1A1A] px-6 py-24 text-white md:px-12 md:py-36">
      <div className="pointer-events-none absolute right-1/4 top-0 h-96 w-96 rounded-full bg-[#0C2686]/20 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-16 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 font-sans text-xs font-medium uppercase tracking-[0.3em] text-[#4051C7]">
              <Headphones className="size-4" />
              <span>{lang === 'bg' ? 'Аудио Журнал' : 'Audio Stories'}</span>
            </div>
            <h2 className="font-heading text-4xl font-light text-white md:text-5xl">
              {lang === 'bg' ? 'Гласовете на Северозапада' : 'Voices of the Northwest'}
            </h2>
            <p className="mt-3 max-w-md font-sans text-xs font-light uppercase tracking-[0.16em] text-white/45">
              {lang === 'bg'
                ? 'Пуснете записа или отворете пълната история'
                : 'Play the recording or open the full story'}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 font-sans text-xs text-white/50 backdrop-blur-md">
              <Radio className="size-3.5 animate-pulse text-emerald-400" />
              <span>
                {lang === 'bg' ? 'Оригинални записи 2026' : 'Original Field Recordings'}
              </span>
            </div>
            <ViewAllLink
              to="/voices"
              lang={lang}
              className="text-[#9FACE6] hover:text-white hover:opacity-100"
            />
          </div>
        </div>

        <VoicesPlayerGrid lang={lang} voices={voices} />
      </div>
    </section>
  )
}
