import { Link } from '@/components/LocaleLink'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { PageMeta } from '@/components/PageMeta'
import { ListingHeader } from '@/components/concept-3/ListingHeader'
import { ListingPagination } from '@/components/concept-3/ListingPagination'
import { SponsoredBadge } from '@/components/concept-3/SponsoredBadge'
import { RegionMap } from '@/components/concept-3/RegionMap'
import { ListingBody, listingCountLabel } from '@/components/concept-3/ListingBody'
import { ListingFilters } from '@/components/concept-3/ListingFilters'
import { ResponsiveImage } from '@/components/ResponsiveImage'
import {
  articlePath,
  preferApi,
  usePublicArticleListing,
  usePublicSeries,
  usePublicTags,
} from '@/lib/public-content'
import { useListingFilters } from '@/lib/listing-filters'
import { toPlaceCard } from '@/lib/section-cards'

export default function PlacesPage() {
  const { location, topic, series, page, setPage, setFilters } =
    useListingFilters()
  const listing = usePublicArticleListing('places', {
    location: location || undefined,
    topic: topic || undefined,
    series: series || undefined,
    page,
  })
  const locationsQuery = usePublicTags('LOCATION')
  const topicsQuery = usePublicTags('TOPIC')
  const seriesQuery = usePublicSeries()

  return (
    <JournalShell>
      {({ lang }) => {
        const places = preferApi(
          listing.items.map((article) => ({
            ...toPlaceCard(article),
            path: articlePath(article),
          })),
        )

        return (
          <main>
            <PageMeta
              lang={lang}
              title={lang === 'bg' ? 'Нашите места' : 'Our Places'}
              description={
                lang === 'bg'
                  ? 'Градове, села и пътеки из Северозапада — местата, в които живеят историите.'
                  : 'Towns, villages, and trails across the Northwest — the places where our stories live.'
              }
              path="/places"
            />
            <ListingHeader
              lang={lang}
              eyebrow={lang === 'bg' ? 'География' : 'Geography'}
              title={lang === 'bg' ? 'Нашите места' : 'Our Places'}
              description={
                lang === 'bg'
                  ? 'Градове, села и пътеки из Северозапада — местата, в които живеят историите.'
                  : 'Towns, villages, and trails across the Northwest — the places where our stories live.'
              }
              countLabel={listingCountLabel(
                lang,
                listing.isLoading,
                lang === 'bg'
                  ? `${listing.total} места`
                  : `${listing.total} places`,
              )}
            />

            <RegionMap
              className="mx-auto max-w-7xl px-6 pt-10 md:px-12"
              selectedSlug={location}
              onSelect={(slug) => setFilters({ location: slug })}
            />

            <ListingFilters
              lang={lang}
              location={{
                value: location,
                options: (locationsQuery.data ?? []).map((tag) => ({
                  value: tag.slug,
                  label: lang === 'bg' ? tag.nameBg : tag.name,
                })),
                onChange: (value) => setFilters({ location: value }),
              }}
              topic={{
                value: topic,
                options: (topicsQuery.data ?? []).map((tag) => ({
                  value: tag.slug,
                  label: lang === 'bg' ? tag.nameBg : tag.name,
                })),
                onChange: (value) => setFilters({ topic: value }),
              }}
              series={{
                value: series,
                options: (seriesQuery.data ?? []).map((item) => ({
                  value: item.slug,
                  label: lang === 'bg' ? item.titleBg : item.title || item.titleBg,
                })),
                onChange: (value) => setFilters({ series: value }),
              }}
            />

            <div className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-20">
              <ListingBody
                lang={lang}
                isLoading={listing.isLoading}
                isError={listing.isError}
                isEmpty={places.length === 0}
                empty={
                  lang === 'bg'
                    ? 'Няма публикувани места.'
                    : 'No published places yet.'
                }
                gridClassName="grid grid-cols-1 gap-8 md:grid-cols-2"
                cardClassName="h-[420px] md:h-[480px]"
              >
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                {places.map((place, index) => {
                  return (
                    <motion.div
                      key={place.id}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.7, delay: Math.min(index, 8) * 0.08 }}
                    >
                      <Link
                        to={place.path}
                        className="group relative block h-[420px] overflow-hidden rounded-[16px] border border-[#EAE6DF] bg-[#1A1A1A] shadow-[0_4px_24px_rgba(0,0,0,0.03)] transition-all duration-500 hover:shadow-[0_12px_40px_rgba(0,0,0,0.09)] md:h-[480px]"
                      >
                        <ResponsiveImage
                          src={place.image}
                          thumbSrc={place.imageThumb}
                          alt={place.name}
                          sizes="grid2"
                          className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                        <div className="absolute inset-0 flex flex-col justify-between p-8 text-white md:p-12">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-sans text-xs uppercase tracking-[0.3em] text-white/70">
                                {place.readTime}
                              </span>
                              {place.sponsored ? (
                                <SponsoredBadge
                                  lang={lang}
                                  sponsorName={place.sponsorName}
                                  tone="onDark"
                                />
                              ) : null}
                            </div>
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/30 text-white backdrop-blur-md transition-all duration-300 group-hover:bg-white group-hover:text-[#1A1A1A]">
                              <ArrowUpRight className="size-5 stroke-[1.5]" />
                            </div>
                          </div>
                          <div>
                            <h2 className="mb-3 font-heading text-4xl font-light text-white md:text-5xl">
                              {lang === 'bg' ? place.nameBg : place.name}
                            </h2>
                            <p className="mb-3 max-w-md font-sans text-sm font-light leading-relaxed text-white/80 md:text-base">
                              {lang === 'bg' ? place.subBg : place.sub}
                            </p>
                            <p className="max-w-md font-sans text-xs font-light leading-relaxed text-white/55">
                              {place.detail}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
              </ListingBody>
              <ListingPagination
                lang={lang}
                page={page}
                totalPages={listing.totalPages}
                onPage={setPage}
              />
            </div>
          </main>
        )
      }}
    </JournalShell>
  )
}
