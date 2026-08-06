import { Radio } from 'lucide-react'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { ListingHeader } from '@/components/concept-3/ListingHeader'
import {
  VoicesPlayerGrid,
  toVoiceItem,
} from '@/components/concept-3/VoicesPlayerGrid'
import { journalContent } from '@/data/concept-3/content'
import { preferApi, usePublicArticles } from '@/lib/public-content'

export default function VoicesPage() {
  const { data } = usePublicArticles('voices')

  return (
    <JournalShell>
      {({ lang }) => {
        const voices = preferApi(
          data?.map(toVoiceItem),
          journalContent.voices.map((voice) => ({ ...voice })),
        )

        return (
          <main className="bg-[#1A1A1A] text-white">
            <ListingHeader
              lang={lang}
              tone="dark"
              eyebrow={lang === 'bg' ? 'Аудио Журнал' : 'Audio Stories'}
              title={
                lang === 'bg' ? 'Гласовете на Северозапада' : 'Voices of the Northwest'
              }
              description={
                lang === 'bg'
                  ? 'Пуснете записа направо тук, или кликнете картата / „Отворете пълната история“, за да прочетете цялата страница.'
                  : 'Play a recording right here, or click a card / “Open full story” to read the full page.'
              }
              countLabel={
                lang === 'bg' ? `${voices.length} записа` : `${voices.length} recordings`
              }
            />

            <div className="relative overflow-hidden px-6 py-16 md:px-12 md:py-20">
              <div className="pointer-events-none absolute right-1/4 top-0 h-96 w-96 rounded-full bg-[#0C2686]/20 blur-3xl" />

              <div className="relative z-10 mx-auto max-w-7xl">
                <div className="mb-10 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 font-sans text-xs text-white/50 backdrop-blur-md">
                  <Radio className="size-3.5 animate-pulse text-emerald-400" />
                  <span>
                    {lang === 'bg' ? 'Оригинални записи 2026' : 'Original Field Recordings'}
                  </span>
                </div>

                <VoicesPlayerGrid lang={lang} voices={voices} animateOnMount />
              </div>
            </div>
          </main>
        )
      }}
    </JournalShell>
  )
}
