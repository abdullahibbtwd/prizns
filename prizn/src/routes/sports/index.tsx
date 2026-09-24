import { Link } from '@/components/LocaleLink'
import { motion } from 'framer-motion'
import { MapPin } from 'lucide-react'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { PageMeta } from '@/components/PageMeta'
import { ListingHeader } from '@/components/concept-3/ListingHeader'
import { ListingPagination } from '@/components/concept-3/ListingPagination'
import { ListingBody, listingCountLabel } from '@/components/concept-3/ListingBody'
import {
  articlePath,
  preferApi,
  usePublicArticleListing,
} from '@/lib/public-content'
import { useListingFilters } from '@/lib/listing-filters'
import type { CmsArticle } from '@/lib/cms-types'

function toSportsCard(article: CmsArticle) {
  return {
    id: article.slug || article.id,
    title: article.title || article.titleBg,
    titleBg: article.titleBg,
    sub: article.category || article.subtitle || '',
    subBg: article.categoryBg || article.subtitleBg || '',
    location: article.location || '',
    locationBg: article.locationBg || '',
    readTime: article.readTime || '',
    readTimeBg: article.readTimeBg || '',
    image: article.image || '',
    excerpt: article.subtitle || article.subtitleBg || '',
    path: articlePath(article),
  }
}

export default function SportsPage() {
  const { page, setPage } = useListingFilters()
  const listing = usePublicArticleListing('sports', { page })

  return (
    <JournalShell>
      {({ lang }) => {
        const items = preferApi(listing.items.map(toSportsCard))

        return (
          <main>
            <PageMeta
              lang={lang}
              title={lang === 'bg' ? 'Спорт' : 'Sports'}
              description={
                lang === 'bg'
                  ? 'Местен спорт като принадлежност — реки, скали, терени и утринна дисциплина.'
                  : 'Local sport as belonging — rivers, rock, pitches, and morning discipline.'
              }
              path="/sports"
            />
            <ListingHeader
              lang={lang}
              eyebrow={lang === 'bg' ? 'Движение & Място' : 'Movement & Place'}
              title={lang === 'bg' ? 'Спорт' : 'Sports'}
              description={
                lang === 'bg'
                  ? 'Местен спорт като принадлежност — реки, скали, терени и утринна дисциплина.'
                  : 'Local sport as belonging — rivers, rock, pitches, and morning discipline.'
              }
              countLabel={listingCountLabel(
                lang,
                listing.isLoading,
                lang === 'bg'
                  ? `${listing.total} истории`
                  : `${listing.total} stories`,
              )}
            />

            <div className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-20">
              <ListingBody
                lang={lang}
                isLoading={listing.isLoading}
                isError={listing.isError}
                isEmpty={items.length === 0}
                empty={
                  lang === 'bg'
                    ? 'Няма публикувани спортни истории.'
                    : 'No published sports stories yet.'
                }
                gridClassName="flex flex-col gap-10"
                cardClassName="aspect-[16/10]"
              >
              <div className="flex flex-col gap-10">
                {items.map((item, index) => {
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: Math.min(index, 8) * 0.06 }}
                    >
                      <Link
                        to={item.path}
                        className="group grid grid-cols-1 items-center gap-6 border-b border-[#EAE6DF] pb-10 md:grid-cols-12 md:gap-10"
                      >
                        <div className="aspect-[16/10] overflow-hidden rounded-[14px] bg-[#1A1A1A] md:col-span-5">
                          <img
                            src={item.image}
                            alt={lang === 'bg' ? item.titleBg : item.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        </div>
                        <div className="md:col-span-7">
                          <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#0C2686]">
                            {[
                              lang === 'bg' ? item.subBg : item.sub,
                              lang === 'bg' ? item.readTimeBg : item.readTime,
                            ]
                              .map((part) => (part || '').trim())
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                          <h2 className="mt-2 font-heading text-3xl font-normal text-[#1A1A1A] transition-colors group-hover:text-[#0C2686] md:text-4xl">
                            {lang === 'bg' ? item.titleBg : item.title}
                          </h2>
                          {item.excerpt?.trim() ? (
                            <p className="mt-3 max-w-xl line-clamp-2 font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/65 md:text-base">
                              {item.excerpt}
                            </p>
                          ) : null}
                          {((lang === 'bg' ? item.locationBg : item.location) || '').trim() ? (
                            <p className="mt-4 inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.18em] text-[#1A1A1A]/45">
                              <MapPin className="size-3 text-[#0C2686]" />
                              {lang === 'bg' ? item.locationBg : item.location}
                            </p>
                          ) : null}
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
