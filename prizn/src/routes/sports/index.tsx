import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin } from 'lucide-react'
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
  const { data } = usePublicArticles('sports')

  return (
    <JournalShell>
      {({ lang }) => {
        const items = preferApi(
          data?.map(toSportsCard),
          journalContent.sports.map((item) => ({
            ...item,
            path: getArticleBySourceId(item.id)?.path ?? `/sports/${item.id}`,
          })),
        )

        return (
          <main>
            <ListingHeader
              lang={lang}
              eyebrow={lang === 'bg' ? 'Движение & Място' : 'Movement & Place'}
              title={lang === 'bg' ? 'Спорт' : 'Sports'}
              description={
                lang === 'bg'
                  ? 'Местен спорт като принадлежност — реки, скали, терени и утринна дисциплина.'
                  : 'Local sport as belonging — rivers, rock, pitches, and morning discipline.'
              }
              countLabel={
                lang === 'bg' ? `${items.length} истории` : `${items.length} stories`
              }
            />

            <div className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-20">
              <div className="flex flex-col gap-10">
                {items.map((item, index) => {
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.06 }}
                    >
                      <Link
                        to={item.path}
                        className="group grid grid-cols-1 items-center gap-6 border-b border-[#EAE6DF] pb-10 md:grid-cols-12 md:gap-10"
                      >
                        <div className="aspect-[16/10] overflow-hidden rounded-[14px] bg-[#1A1A1A] md:col-span-5">
                          <img
                            src={item.image}
                            alt={lang === 'bg' ? item.titleBg : item.title}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        </div>
                        <div className="md:col-span-7">
                          <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#0C2686]">
                            {lang === 'bg' ? item.subBg : item.sub}
                            {' · '}
                            {lang === 'bg' ? item.readTimeBg : item.readTime}
                          </span>
                          <h2 className="mt-2 font-heading text-3xl font-normal text-[#1A1A1A] transition-colors group-hover:text-[#0C2686] md:text-4xl">
                            {lang === 'bg' ? item.titleBg : item.title}
                          </h2>
                          <p className="mt-3 max-w-xl font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/65 md:text-base">
                            {item.excerpt}
                          </p>
                          <p className="mt-4 inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.18em] text-[#1A1A1A]/45">
                            <MapPin className="size-3 text-[#0C2686]" />
                            {lang === 'bg' ? item.locationBg : item.location}
                          </p>
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
