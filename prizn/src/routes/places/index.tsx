import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { ListingHeader } from '@/components/concept-3/ListingHeader'
import { SponsoredBadge } from '@/components/concept-3/SponsoredBadge'
import {
  articlePath,
  preferApi,
  usePublicArticles,
  usePublicTags,
} from '@/lib/public-content'
import { toPlaceCard } from '@/lib/section-cards'
import { cn } from '@/lib/utils'

export default function PlacesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedLocation = searchParams.get('location') || ''
  const { data } = usePublicArticles('places', {
    location: selectedLocation || undefined,
  })
  const locationsQuery = usePublicTags('LOCATION')

  return (
    <JournalShell>
      {({ lang }) => {
        const places = preferApi(
          data?.map((article) => ({
            ...toPlaceCard(article),
            path: articlePath(article),
          })),
        )

        return (
          <main>
            <ListingHeader
              lang={lang}
              eyebrow={lang === 'bg' ? 'География' : 'Geography'}
              title={lang === 'bg' ? 'Нашите места' : 'Our Places'}
              description={
                lang === 'bg'
                  ? 'Градове, села и пътеки из Северозапада — местата, в които живеят историите.'
                  : 'Towns, villages, and trails across the Northwest — the places where our stories live.'
              }
              countLabel={
                lang === 'bg' ? `${places.length} места` : `${places.length} places`
              }
            />

            {(locationsQuery.data ?? []).length > 0 ? (
              <div className="mx-auto max-w-7xl px-6 pt-10 md:px-12">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 font-sans text-[11px] uppercase tracking-[0.2em] text-[#1A1A1A]/45">
                    {lang === 'bg' ? 'Място' : 'Location'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSearchParams({})}
                    className={cn(
                      'rounded-full border px-3 py-1.5 font-sans text-[11px] uppercase tracking-[0.16em] transition-colors',
                      !selectedLocation
                        ? 'border-[#0C2686] bg-[#0C2686] text-white'
                        : 'border-[#EAE6DF] bg-white text-[#1A1A1A]/70 hover:border-[#0C2686]/40',
                    )}
                  >
                    {lang === 'bg' ? 'Всички' : 'All'}
                  </button>
                  {(locationsQuery.data ?? []).map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setSearchParams({ location: tag.slug })}
                      className={cn(
                        'rounded-full border px-3 py-1.5 font-sans text-[11px] uppercase tracking-[0.16em] transition-colors',
                        selectedLocation === tag.slug
                          ? 'border-[#0C2686] bg-[#0C2686] text-white'
                          : 'border-[#EAE6DF] bg-white text-[#1A1A1A]/70 hover:border-[#0C2686]/40',
                      )}
                    >
                      {lang === 'bg' ? tag.nameBg : tag.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-20">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                {places.map((place, index) => {
                  return (
                    <motion.div
                      key={place.id}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.7, delay: index * 0.08 }}
                    >
                      <Link
                        to={place.path}
                        className="group relative block h-[420px] overflow-hidden rounded-[16px] border border-[#EAE6DF] bg-[#1A1A1A] shadow-[0_4px_24px_rgba(0,0,0,0.03)] transition-all duration-500 hover:shadow-[0_12px_40px_rgba(0,0,0,0.09)] md:h-[480px]"
                      >
                        <img
                          src={place.image}
                          alt={place.name}
                          loading="lazy"
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
            </div>
          </main>
        )
      }}
    </JournalShell>
  )
}
