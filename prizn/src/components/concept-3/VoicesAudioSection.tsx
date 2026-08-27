import { ArrowDown, Headphones, Radio } from 'lucide-react'
import { ViewAllLink } from '@/components/concept-3/ViewAllLink'
import { SectionLoading } from '@/components/concept-3/SectionLoading'
import {
  VoicesPlayerGrid,
  toVoiceItem,
} from '@/components/concept-3/VoicesPlayerGrid'
import { preferApi, usePublicArticles } from '@/lib/public-content'

interface VoicesAudioSectionProps {
  lang: 'bg' | 'en'
}

function scrollToDiscover() {
  document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' })
}

export function VoicesAudioSection({ lang }: VoicesAudioSectionProps) {
  const { data, isLoading } = usePublicArticles(undefined, { hasAudio: true })
  const voices = preferApi(
    data?.filter((article) => Boolean(article.audioUrl)).map(toVoiceItem),
  ).slice(0, 3)

  return (
    <section id="voices" className="relative overflow-hidden bg-[#1A1A1A] pt-24 text-white md:pt-36">
      <div className="pointer-events-none absolute right-1/4 top-0 h-96 w-96 rounded-full bg-[#0C2686]/20 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 pb-16 md:px-12 md:pb-20">
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
                ? 'Нарации и записи — кликнете за пълната история'
                : 'Narrations and recordings — click for the full story'}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 font-sans text-xs text-white/50 backdrop-blur-md">
              <Radio className="size-3.5 animate-pulse text-emerald-400" />
              <span>
                {lang === 'bg' ? 'От всички секции' : 'From every section'}
              </span>
            </div>
            <ViewAllLink
              to="/voices"
              lang={lang}
              className="text-[#9FACE6] hover:text-white hover:opacity-100"
            />
          </div>
        </div>

        {isLoading ? (
          <SectionLoading
            lang={lang}
            count={3}
            tone="dark"
            cardClassName="h-36"
          />
        ) : voices.length > 0 ? (
          <VoicesPlayerGrid lang={lang} voices={voices} />
        ) : null}

        <div className="mt-16 flex justify-center md:mt-20">
          <button
            type="button"
            onClick={scrollToDiscover}
            className="group inline-flex cursor-pointer items-center gap-3 rounded-full border border-white/30 px-7 py-3.5 font-sans text-xs uppercase tracking-[0.3em] text-white/90 backdrop-blur-xs transition-all duration-300 hover:border-white hover:bg-white/10 hover:text-white"
            aria-label={lang === 'bg' ? 'Още съдържание по-надолу' : 'More content below'}
          >
            <span>{lang === 'bg' ? 'Продължете надолу' : 'Continue below'}</span>
            <ArrowDown className="size-3.5 stroke-[1.5] transition-transform duration-300 group-hover:translate-y-1" />
          </button>
        </div>
      </div>

      <div
        aria-hidden
        className="h-14 bg-gradient-to-b from-[#1A1A1A] to-[#FDFBF7] md:h-16"
      />
    </section>
  )
}
