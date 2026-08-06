import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarDays } from 'lucide-react'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { ListingHeader } from '@/components/concept-3/ListingHeader'
import { journalContent } from '@/data/concept-3/content'
import { getArticleBySourceId } from '@/data/concept-3/articles'
import {
  articlePath,
  preferApi,
  usePublicArticles,
} from '@/lib/public-content'
import type { CmsArticle } from '@/lib/cms-types'

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
  const { data } = usePublicArticles('events')

  return (
    <JournalShell>
      {({ lang }) => {
        const items = preferApi(
          data?.map(toEventsCard),
          journalContent.events.map((item) => ({
            ...item,
            path: getArticleBySourceId(item.id)?.path ?? `/events/${item.id}`,
          })),
        )

        return (
          <main>
            <ListingHeader
              lang={lang}
              eyebrow={lang === 'bg' ? 'Календар' : 'Calendar'}
              title={lang === 'bg' ? 'Събития' : 'Events'}
              description={
                lang === 'bg'
                  ? 'Панаири, нощни пътеки и пазари — живият календар на Северозапада.'
                  : 'Fairs, night paths, and markets — the living calendar of the Northwest.'
              }
              countLabel={
                lang === 'bg' ? `${items.length} събития` : `${items.length} events`
              }
            />

            <div className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-20">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                {items.map((item, index) => {
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.06 }}
                    >
                      <Link to={item.path} className="group block">
                        <div className="aspect-[16/10] overflow-hidden rounded-[14px] bg-[#1A1A1A]">
                          <img
                            src={item.image}
                            alt={lang === 'bg' ? item.titleBg : item.title}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        </div>
                        <p className="mt-4 inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.18em] text-[#0C2686]">
                          <CalendarDays className="size-3.5" />
                          {lang === 'bg' ? item.dateBg : item.date}
                          {' · '}
                          {lang === 'bg' ? item.locationBg : item.location}
                        </p>
                        <h2 className="mt-2 font-heading text-2xl font-normal text-[#1A1A1A] transition-colors group-hover:text-[#0C2686] md:text-3xl">
                          {lang === 'bg' ? item.titleBg : item.title}
                        </h2>
                        <p className="mt-2 font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/60">
                          {item.excerpt}
                        </p>
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
