import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Clock, MapPin } from 'lucide-react'
import { ViewAllLink } from '@/components/concept-3/ViewAllLink'
import { EpisodeBadge } from '@/components/concept-3/EpisodeBadge'
import {
  articlePath,
  preferApi,
  usePublicArticles,
} from '@/lib/public-content'
import { toHumanStoryCard } from '@/lib/section-cards'

interface HumanStoriesSectionProps {
  lang: 'bg' | 'en'
}

export function HumanStoriesSection({ lang }: HumanStoriesSectionProps) {
  const { data } = usePublicArticles('stories')
  const stories = preferApi(
    data?.map((article) => ({
      ...toHumanStoryCard(article),
      path: articlePath(article),
    })),
  ).slice(0, 3)

  return (
    <section id="human-stories" className="bg-[#FDFBF7] py-20 md:py-28 px-6 md:px-12 border-t border-[#EAE6DF]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="mb-2 block font-sans text-xs font-medium uppercase tracking-[0.3em] text-[#0C2686]">
              {lang === 'bg' ? 'Хора & Съдби' : 'People & Voices'}
            </span>
            <h2 className="font-heading text-4xl font-light text-[#1A1A1A] md:text-5xl">
              {lang === 'bg' ? 'Човешки истории' : 'Human Stories'}
            </h2>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <p className="max-w-xs font-sans text-xs uppercase tracking-[0.2em] text-[#1A1A1A]/50 md:text-right">
              {lang === 'bg'
                ? 'Дълги портрети от села, брегове и работилници.'
                : 'Long portraits from villages, riverbanks, and workshops.'}
            </p>
            <ViewAllLink to="/stories" lang={lang} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {stories.map((story, index) => {
            return (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: index * 0.08 }}
              >
                <Link to={story.path} className="group block">
                  <div className="relative mb-5 aspect-[4/5] overflow-hidden rounded-[16px] bg-[#1A1A1A]">
                    <img
                      src={story.image}
                      alt={story.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
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

                  <h3 className="font-heading text-2xl font-normal leading-snug text-[#1A1A1A] transition-colors group-hover:text-[#0C2686]">
                    {lang === 'bg' ? story.titleBg : story.title}
                  </h3>
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
                    {lang === 'bg' ? 'Прочетете' : 'Read'}
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
