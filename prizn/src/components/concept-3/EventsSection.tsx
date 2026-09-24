import { Link } from '@/components/LocaleLink'
import { motion } from 'framer-motion'
import { CalendarDays } from 'lucide-react'
import { ViewAllLink } from '@/components/concept-3/ViewAllLink'
import {
  articlePath,
  preferApi,
  usePublicArticles,
} from '@/lib/public-content'
import type { CmsArticle } from '@/lib/cms-types'
import { joinMetaParts } from '@/lib/text-format'
import { ResponsiveImage } from '@/components/ResponsiveImage'
import { formatArticleDate } from '@/lib/format-date'

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
    imageThumb: article.imageThumb || '',
    excerpt: article.subtitle || article.subtitleBg || '',
    path: articlePath(article),
  }
}

export function EventsSection({ lang }: EventsSectionProps) {
  const { data } = usePublicArticles('events', { limit: 4 })
  const items = preferApi(data?.map(toEventsCard)).slice(0, 4)

  return (
    <section id="events" className="border-t border-[#EAE6DF] bg-[#FDFBF7] px-6 py-20 md:px-12 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="mb-2 block font-sans text-xs font-medium uppercase tracking-[0.3em] text-[#0C2686]">
              {lang === 'bg' ? 'От терена' : 'From the field'}
            </span>
            <h2 className="font-heading text-4xl font-light text-[#1A1A1A] md:text-5xl">
              {lang === 'bg' ? 'Събития и репортажи' : 'Events & reports'}
            </h2>
          </div>
          <ViewAllLink to="/events" lang={lang} />
        </div>

        <div className="relative">
          <div className="absolute bottom-0 left-[11px] top-2 w-px bg-[#EAE6DF] md:left-[15px]" aria-hidden />
          <div className="flex flex-col gap-10">
            {items.map((item, index) => {
              const date = formatArticleDate(lang, item.date, item.dateBg).trim()
              const location = (
                lang === 'bg' ? item.locationBg : item.location
              ).trim()
              const meta = joinMetaParts(date, location)
              return (
                <motion.div
                  key={item.id}
                  initial={false}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: index * 0.04 }}
                >
                  <Link to={item.path} className="group grid grid-cols-[24px_1fr] gap-5 md:grid-cols-[32px_180px_1fr] md:gap-8">
                    <div className="relative z-10 mt-1.5 flex size-6 items-center justify-center rounded-full border border-[#0C2686]/30 bg-[#FDFBF7] md:size-8">
                      <span className="size-2 rounded-full bg-[#0C2686] transition-transform group-hover:scale-125" />
                    </div>

                    <div className="hidden md:block">
                      {date ? (
                        <p className="inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.18em] text-[#0C2686]">
                          <CalendarDays className="size-3.5" />
                          {date}
                        </p>
                      ) : null}
                      {location ? (
                        <p className="mt-2 font-sans text-[11px] uppercase tracking-[0.18em] text-[#1A1A1A]/40">
                          {location}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-[160px_1fr] sm:gap-6">
                      <div className="aspect-[4/3] overflow-hidden rounded-[12px] bg-[#1A1A1A]">
                        <ResponsiveImage
                          src={item.image}
                          thumbSrc={item.imageThumb}
                          alt={lang === 'bg' ? item.titleBg : item.title}
                          sizes="compact"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      </div>
                      <div>
                        {meta ? (
                          <p className="mb-1 font-sans text-[11px] uppercase tracking-[0.18em] text-[#0C2686] md:hidden">
                            {meta}
                          </p>
                        ) : null}
                        <h3 className="font-heading text-2xl font-normal text-[#1A1A1A] transition-colors group-hover:text-[#0C2686] md:text-3xl">
                          {lang === 'bg' ? item.titleBg : item.title}
                        </h3>
                        {item.excerpt?.trim() ? (
                          <p className="mt-2 max-w-xl line-clamp-2 font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/60">
                            {item.excerpt}
                          </p>
                        ) : null}
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
