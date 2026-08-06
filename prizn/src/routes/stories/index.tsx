import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Clock, MapPin } from 'lucide-react'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { ListingHeader } from '@/components/concept-3/ListingHeader'
import { EpisodeBadge } from '@/components/concept-3/EpisodeBadge'
import { JournalSelect } from '@/components/ui/JournalSelect'
import { journalContent } from '@/data/concept-3/content'
import { getArticleBySourceId } from '@/data/concept-3/articles'
import {
  articlePath,
  preferApi,
  usePublicArticles,
  usePublicSeries,
} from '@/lib/public-content'
import { toHumanStoryCard } from '@/lib/section-cards'
import { cn } from '@/lib/utils'

export default function StoriesPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedSeries = searchParams.get('series') || ''
  const seriesMode =
    searchParams.get('view') === 'series' || Boolean(selectedSeries)

  const { data } = usePublicArticles(
    'stories',
    selectedSeries || undefined,
  )
  const seriesQuery = usePublicSeries()

  const stories = preferApi(
    data?.map((article) => ({
      ...toHumanStoryCard(article),
      path: articlePath(article),
    })),
    selectedSeries
      ? []
      : journalContent.humanStories.map((story) => ({
          ...story,
          path:
            getArticleBySourceId(story.id)?.path ?? `/stories/${story.id}`,
          series: null as null,
        })),
  )

  const seriesOptions = (seriesQuery.data ?? []).map((item) => ({
    value: item.slug,
    label: item.titleBg || item.title,
  }))

  const setModeAll = () => {
    setSearchParams({})
  }

  const setModeSeries = () => {
    if (selectedSeries) {
      setSearchParams({ view: 'series', series: selectedSeries })
      return
    }
    setSearchParams({ view: 'series' })
  }

  const setSeriesFilter = (slug: string) => {
    if (!slug) {
      setSearchParams({ view: 'series' })
      return
    }
    setSearchParams({ view: 'series', series: slug })
  }

  return (
    <JournalShell>
      {({ lang }) => (
        <main>
          <ListingHeader
            lang={lang}
            eyebrow={t('humanStoriesEyebrow')}
            title={t('humanStories')}
            description={t('humanStoriesDesc')}
            countLabel={t('storiesCount', { count: stories.length })}
          />

          <div className="mx-auto max-w-7xl px-6 pt-10 md:px-12">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 font-sans text-[11px] uppercase tracking-[0.2em] text-[#1A1A1A]/45">
                  {lang === 'bg' ? 'Филтър' : 'Filter'}
                </span>
                <button
                  type="button"
                  onClick={setModeAll}
                  className={cn(
                    'rounded-full border px-3 py-1.5 font-sans text-[11px] uppercase tracking-[0.16em] transition-colors',
                    !seriesMode
                      ? 'border-[#0C2686] bg-[#0C2686] text-white'
                      : 'border-[#EAE6DF] bg-white text-[#1A1A1A]/70 hover:border-[#0C2686]/40',
                  )}
                >
                  {lang === 'bg' ? 'Всички' : 'All'}
                </button>
                <button
                  type="button"
                  onClick={setModeSeries}
                  className={cn(
                    'rounded-full border px-3 py-1.5 font-sans text-[11px] uppercase tracking-[0.16em] transition-colors',
                    seriesMode
                      ? 'border-[#0C2686] bg-[#0C2686] text-white'
                      : 'border-[#EAE6DF] bg-white text-[#1A1A1A]/70 hover:border-[#0C2686]/40',
                  )}
                >
                  {lang === 'bg' ? 'Поредица' : 'Series'}
                </button>
              </div>

              {seriesMode ? (
                <div className="w-full max-w-sm sm:min-w-[16rem]">
                  <JournalSelect
                    name="seriesFilter"
                    label={
                      lang === 'bg' ? 'Изберете поредица' : 'Choose a series'
                    }
                    placeholder={
                      lang === 'bg' ? 'Изберете поредица…' : 'Select a series…'
                    }
                    options={
                      lang === 'bg'
                        ? seriesOptions
                        : (seriesQuery.data ?? []).map((item) => ({
                            value: item.slug,
                            label: item.title || item.titleBg,
                          }))
                    }
                    value={selectedSeries}
                    onChange={setSeriesFilter}
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-20">
            {seriesMode && !selectedSeries ? (
              <p className="text-center font-sans text-sm text-[#1A1A1A]/55">
                {lang === 'bg'
                  ? 'Изберете поредица, за да видите епизодите.'
                  : 'Choose a series to see its episodes.'}
              </p>
            ) : stories.length === 0 ? (
              <p className="text-center font-sans text-sm text-[#1A1A1A]/55">
                {lang === 'bg'
                  ? 'Няма истории в тази поредица.'
                  : 'No stories in this series.'}
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
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : null}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                        {story.series ? (
                          <div className="absolute left-3 top-3 right-3">
                            <EpisodeBadge lang={lang} series={story.series} />
                          </div>
                        ) : null}
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
