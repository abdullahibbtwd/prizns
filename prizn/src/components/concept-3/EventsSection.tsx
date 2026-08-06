import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarDays } from 'lucide-react'
import { journalContent } from '@/data/concept-3/content'
import { getArticleBySourceId } from '@/data/concept-3/articles'
import { ViewAllLink } from '@/components/concept-3/ViewAllLink'
import {
  articlePath,
  preferApi,
  usePublicArticles,
} from '@/lib/public-content'
import type { CmsArticle } from '@/lib/cms-types'

interface EventsSectionProps {
  lang: 'bg' | 'en'
}

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

export function EventsSection({ lang }: EventsSectionProps) {
  const { data } = usePublicArticles('events')
  const items = preferApi(
    data?.map(toEventsCard),
    journalContent.events.map((item) => ({
      ...item,
      path: getArticleBySourceId(item.id)?.path ?? `/events/${item.id}`,
    })),
  ).slice(0, 4)

  return (
    <section id="events" className="border-t border-[#EAE6DF] bg-[#FDFBF7] px-6 py-20 md:px-12 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="mb-2 block font-sans text-xs font-medium uppercase tracking-[0.3em] text-[#0C2686]">
              {lang === 'bg' ? 'Календар' : 'Calendar'}
            </span>
            <h2 className="font-heading text-4xl font-light text-[#1A1A1A] md:text-5xl">
              {lang === 'bg' ? 'Събития' : 'Events'}
            </h2>
          </div>
          <ViewAllLink to="/events" lang={lang} />
        </div>

        <div className="relative">
          <div className="absolute bottom-0 left-[11px] top-2 w-px bg-[#EAE6DF] md:left-[15px]" aria-hidden />
          <div className="flex flex-col gap-10">
            {items.map((item, index) => {
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.65, delay: index * 0.06 }}
                >
                  <Link to={item.path} className="group grid grid-cols-[24px_1fr] gap-5 md:grid-cols-[32px_180px_1fr] md:gap-8">
                    <div className="relative z-10 mt-1.5 flex size-6 items-center justify-center rounded-full border border-[#0C2686]/30 bg-[#FDFBF7] md:size-8">
                      <span className="size-2 rounded-full bg-[#0C2686] transition-transform group-hover:scale-125" />
                    </div>

                    <div className="hidden md:block">
                      <p className="inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.18em] text-[#0C2686]">
                        <CalendarDays className="size-3.5" />
                        {lang === 'bg' ? item.dateBg : item.date}
                      </p>
                      <p className="mt-2 font-sans text-[11px] uppercase tracking-[0.18em] text-[#1A1A1A]/40">
                        {lang === 'bg' ? item.locationBg : item.location}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-[160px_1fr] sm:gap-6">
                      <div className="aspect-[4/3] overflow-hidden rounded-[12px] bg-[#1A1A1A]">
                        <img
                          src={item.image}
                          alt={lang === 'bg' ? item.titleBg : item.title}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      </div>
                      <div>
                        <p className="mb-1 font-sans text-[11px] uppercase tracking-[0.18em] text-[#0C2686] md:hidden">
                          {lang === 'bg' ? item.dateBg : item.date}
                          {' · '}
                          {lang === 'bg' ? item.locationBg : item.location}
                        </p>
                        <h3 className="font-heading text-2xl font-normal text-[#1A1A1A] transition-colors group-hover:text-[#0C2686] md:text-3xl">
                          {lang === 'bg' ? item.titleBg : item.title}
                        </h3>
                        <p className="mt-2 max-w-xl font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/60">
                          {item.excerpt}
                        </p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
