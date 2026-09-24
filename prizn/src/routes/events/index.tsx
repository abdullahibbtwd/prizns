import { Link } from '@/components/LocaleLink'
import { motion } from 'framer-motion'
import { CalendarDays } from 'lucide-react'
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
import { joinMetaParts } from '@/lib/text-format'
import { formatArticleDate } from '@/lib/format-date'

function toEventsCard(article: CmsArticle) {
  return {
    id: article.slug || article.id,
    title: article.title || article.titleBg,
    titleBg: article.titleBg,
    date: article.date || '',
    dateBg: article.dateBg || '',
    location: article.location || '',
    locationBg: article.locationBg || '',
    image: article.image || '',
    excerpt: article.subtitle || article.subtitleBg || '',
    path: articlePath(article),
  }
}

export default function EventsPage() {
  const { page, setPage } = useListingFilters()
  const listing = usePublicArticleListing('events', { page })

  return (
    <JournalShell>
      {({ lang }) => {
        const items = preferApi(listing.items.map(toEventsCard))

        return (
          <main>
            <PageMeta
              lang={lang}
              title={
                lang === 'bg' ? 'Събития и репортажи' : 'Events & reports'
              }
              description={
                lang === 'bg'
                  ? 'Репортажи от панаири, пътеки и събирания из Северозападна България.'
                  : 'Reports from fairs, trails, and gatherings across Northwestern Bulgaria.'
              }
              path="/events"
            />
            <ListingHeader
              lang={lang}
              eyebrow={lang === 'bg' ? 'От терена' : 'From the field'}
              title={
                lang === 'bg' ? 'Събития и репортажи' : 'Events & reports'
              }
              description={
                lang === 'bg'
                  ? 'Репортажи от панаири, пътеки и събирания — не жив календар, а истории от мястото.'
                  : 'Reports from fairs, trails, and gatherings — field stories, not a live calendar.'
              }
              countLabel={listingCountLabel(
                lang,
                listing.isLoading,
                lang === 'bg'
                  ? `${listing.total} материала`
                  : `${listing.total} pieces`,
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
                    ? 'Няма публикувани събития.'
                    : 'No published events yet.'
                }
                gridClassName="grid grid-cols-1 gap-8 md:grid-cols-2"
                cardClassName="aspect-[16/10]"
              >
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  {items.map((item, index) => {
                    const date = formatArticleDate(
                      lang,
                      item.date,
                      item.dateBg,
                    ).trim()
                    const location = (
                      lang === 'bg' ? item.locationBg : item.location
                    ).trim()
                    const meta = joinMetaParts(date, location)
                    return (
                      <motion.div
                        key={item.id}
                        initial={false}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.35,
                          delay: Math.min(index, 8) * 0.03,
                        }}
                      >
                        <Link to={item.path} className="group block">
                          <div className="aspect-[16/10] overflow-hidden rounded-[14px] bg-[#1A1A1A]">
                            <img
                              src={item.image}
                              alt={lang === 'bg' ? item.titleBg : item.title}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                          </div>
                          {meta ? (
                            <p className="mt-4 inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.18em] text-[#0C2686]">
                              {date ? (
                                <CalendarDays className="size-3.5" />
                              ) : null}
                              {meta}
                            </p>
                          ) : null}
                          <h2 className="mt-2 font-heading text-2xl font-normal text-[#1A1A1A] transition-colors group-hover:text-[#0C2686] md:text-3xl">
                            {lang === 'bg' ? item.titleBg : item.title}
                          </h2>
                          {item.excerpt?.trim() ? (
                            <p className="mt-2 line-clamp-2 font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/60">
                              {item.excerpt}
                            </p>
                          ) : null}
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
