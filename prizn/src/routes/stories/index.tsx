import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Clock, MapPin } from 'lucide-react'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { PageMeta } from '@/components/PageMeta'
import { ListingHeader } from '@/components/concept-3/ListingHeader'
import { EpisodeBadge } from '@/components/concept-3/EpisodeBadge'
import { SponsoredBadge } from '@/components/concept-3/SponsoredBadge'
import { RegionMap } from '@/components/concept-3/RegionMap'
import {
  articlePath,
  preferApi,
  usePublicArticles,
} from '@/lib/public-content'
import { useListingFilters } from '@/lib/listing-filters'
import { toHumanStoryCard } from '@/lib/section-cards'

export default function StoriesPage() {
  const { t } = useTranslation()
  const { location, setFilters } = useListingFilters()

  const { data } = usePublicArticles('stories', {
    location: location || undefined,
  })

  const stories = preferApi(
    data?.map((article) => ({
      ...toHumanStoryCard(article),
      path: articlePath(article),
    })),
  )

  return (
    <JournalShell>
      {({ lang }) => (
        <main>
          <PageMeta
            lang={lang}
            title={lang === 'bg' ? 'Човешки истории' : 'Human Stories'}
            description={
              lang === 'bg'
                ? 'Човешки истории от Северозападна България.'
                : 'Human stories from Northwestern Bulgaria.'
            }
            path="/stories"
          />
          <ListingHeader
            lang={lang}
            eyebrow={t('humanStoriesEyebrow')}
            title={t('humanStories')}
            description={t('humanStoriesDesc')}
            countLabel={t('storiesCount', { count: stories.length })}
          />

          <RegionMap
            className="mx-auto max-w-7xl px-6 pt-10 md:px-12"
            selectedSlug={location}
            onSelect={(slug) => setFilters({ location: slug })}
          />

          <div className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-20">
            {stories.length === 0 ? (
              <p className="text-center font-sans text-sm text-[#1A1A1A]/55">
                {lang === 'bg'
                  ? 'Няма публикувани истории.'
                  : 'No published stories yet.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
                {stories.map((story, index) => (
                  <motion.div
                    key={story.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.05 }}
                  >
                    <Link to={story.path} className="group block">
                      <div className="relative mb-5 aspect-[4/5] overflow-hidden rounded-[16px] bg-[#1A1A1A]">
                        {story.image ? (
                          <img
                            src={story.image}
                            alt={story.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : null}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                        <div className="absolute left-3 top-3 right-3 flex flex-wrap items-start gap-2">
                          {story.sponsored ? (
                            <SponsoredBadge
                              lang={lang}
                              sponsorName={story.sponsorName}
                              tone="onDark"
                            />
                          ) : null}
                          {story.series ? (
                            <EpisodeBadge lang={lang} series={story.series} />
                          ) : null}
                        </div>
                        <div className="absolute bottom-4 left-4 flex items-center gap-1.5 font-sans text-[11px] text-white/85">
                          <MapPin className="size-3" />
                          {story.location}
                        </div>
                      </div>
                      <h2 className="font-heading text-2xl font-normal leading-snug text-[#1A1A1A] transition-colors group-hover:text-[#0C2686]">
                        {lang === 'bg' ? story.titleBg : story.title}
                      </h2>
                      <p className="mt-2 line-clamp-2 font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/65">
                        {story.excerpt}
                      </p>
                      <div className="mt-4 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-[#1A1A1A]/50">
                        <span>{story.author}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3" />
                          {lang === 'bg' ? story.readTimeBg : story.readTime}
                        </span>
                      </div>
                      <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.2em] text-[#0C2686]">
                        {t('read')}
                        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </main>
      )}
    </JournalShell>
  )
}
