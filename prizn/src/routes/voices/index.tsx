import { Radio } from 'lucide-react'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { ListingHeader } from '@/components/concept-3/ListingHeader'
import {
  VoicesPlayerGrid,
  toVoiceItem,
} from '@/components/concept-3/VoicesPlayerGrid'
import { preferApi, usePublicArticles } from '@/lib/public-content'

export default function VoicesPage() {
  // Global audio shelf: any published story with audio (voices uploads + narrations).
  const { data, isLoading, isError } = usePublicArticles(undefined, {
    hasAudio: true,
  })

  return (
    <JournalShell>
      {({ lang }) => {
        const voices = preferApi(
          data
            ?.filter((article) => Boolean(article.audioUrl))
            .map(toVoiceItem),
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
                  ? 'Слушайте нарации и записи от историите. Кликнете картата, за да отворите пълната страница.'
                  : 'Listen to narrations and field recordings from our stories. Click a card to open the full page.'
              }
              countLabel={
                isLoading
                  ? lang === 'bg'
                    ? 'Зареждане…'
                    : 'Loading…'
                  : lang === 'bg'
                    ? `${voices.length} записа`
                    : `${voices.length} recordings`
              }
            />

            <div className="relative overflow-hidden px-6 py-16 md:px-12 md:py-20">
              <div className="pointer-events-none absolute right-1/4 top-0 h-96 w-96 rounded-full bg-[#0C2686]/20 blur-3xl" />

              <div className="relative z-10 mx-auto max-w-7xl">
                <div className="mb-10 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 font-sans text-xs text-white/50 backdrop-blur-md">
                  <Radio className="size-3.5 animate-pulse text-emerald-400" />
                  <span>
                    {lang === 'bg'
                      ? 'Гласове от всички истории'
                      : 'Voices from every story'}
                  </span>
                </div>

                {isLoading ? (
                  <p className="font-sans text-sm text-white/50">
                    {lang === 'bg' ? 'Зареждане на записи…' : 'Loading recordings…'}
                  </p>
                ) : isError ? (
                  <p className="font-sans text-sm text-rose-300">
                    {lang === 'bg'
                      ? 'Неуспешно зареждане на аудио.'
                      : 'Could not load audio.'}
                  </p>
                ) : voices.length === 0 ? (
                  <p className="font-sans text-sm text-white/50">
                    {lang === 'bg'
                      ? 'Все още няма аудио. Публикувайте история с запис или нарация.'
                      : 'No audio yet. Publish a story with a recording or narration.'}
                  </p>
                ) : (
                  <VoicesPlayerGrid lang={lang} voices={voices} animateOnMount />
                )}
              </div>
            </div>
          </main>
        )
      }}
    </JournalShell>
  )
}
