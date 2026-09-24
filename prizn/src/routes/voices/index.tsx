import { lazy, Suspense } from 'react'
import { Radio } from 'lucide-react'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { PageMeta } from '@/components/PageMeta'
import { ListingHeader } from '@/components/concept-3/ListingHeader'
import { ListingPagination } from '@/components/concept-3/ListingPagination'
import { ListingBody } from '@/components/concept-3/ListingBody'
import { toVoiceItem } from '@/lib/voice-item'
import { preferApi, usePublicArticleListing } from '@/lib/public-content'
import { useListingFilters } from '@/lib/listing-filters'

const VoicesPlayerGrid = lazy(() =>
  import('@/components/concept-3/VoicesPlayerGrid').then((m) => ({
    default: m.VoicesPlayerGrid,
  })),
)

export default function VoicesPage() {
  const { page, setPage } = useListingFilters()
  // Global audio shelf: any published story with audio (voices uploads + narrations).
  const listing = usePublicArticleListing(undefined, {
    hasAudio: true,
    page,
  })

  return (
    <JournalShell>
      {({ lang }) => {
        const voices = preferApi(
          listing.items
            .filter((article) => Boolean(article.audioUrl))
            .map(toVoiceItem),
        )

        return (
          <main className="bg-[#1A1A1A] text-white">
            <PageMeta
              lang={lang}
              title={
                lang === 'bg'
                  ? 'Гласовете на Северозапада'
                  : 'Voices of the Northwest'
              }
              description={
                lang === 'bg'
                  ? 'Слушайте нарации и записи от историите. Кликнете картата, за да отворите пълната страница.'
                  : 'Listen to narrations and field recordings from our stories. Click a card to open the full page.'
              }
              path="/voices"
            />
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
                listing.isLoading
                  ? lang === 'bg'
                    ? 'Зареждане…'
                    : 'Loading…'
                  : lang === 'bg'
                    ? `${listing.total} записа`
                    : `${listing.total} recordings`
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

                <ListingBody
                  lang={lang}
                  isLoading={listing.isLoading}
                  isError={listing.isError}
                  isEmpty={voices.length === 0}
                  empty={
                    lang === 'bg'
                      ? 'Все още няма аудио. Публикувайте история с запис или нарация.'
                      : 'No audio yet. Publish a story with a recording or narration.'
                  }
                  tone="dark"
                  gridClassName="grid grid-cols-1 gap-6 md:grid-cols-2"
                  cardClassName="h-40"
                >
                  <Suspense fallback={null}>
                    <VoicesPlayerGrid lang={lang} voices={voices} animateOnMount />
                  </Suspense>
                </ListingBody>
                <ListingPagination
                  lang={lang}
                  page={page}
                  totalPages={listing.totalPages}
                  onPage={setPage}
                  tone="dark"
                />
              </div>
            </div>
          </main>
        )
      }}
    </JournalShell>
  )
}
