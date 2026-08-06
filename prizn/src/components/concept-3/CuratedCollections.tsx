import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, ChevronRight } from 'lucide-react'
import { journalContent } from '@/data/concept-3/content'
import { getArticleBySourceId } from '@/data/concept-3/articles'
import { ViewAllLink } from '@/components/concept-3/ViewAllLink'
import {
  articlePath,
  usePublicArticles,
  usePublicSeries,
} from '@/lib/public-content'

interface CuratedCollectionsProps {
  lang: 'bg' | 'en'
}

export function CuratedCollections({ lang }: CuratedCollectionsProps) {
  const seriesQuery = usePublicSeries()
  const discoverQuery = usePublicArticles('discover')

  const seriesCards = (seriesQuery.data ?? []).map((series) => ({
    id: series.slug,
    title: series.title,
    titleBg: series.titleBg,
    count: series.count,
    countBg: series.countBg,
    image: series.image,
    description: series.description,
    path: series.path,
  }))

  const discoverCards = (discoverQuery.data ?? []).map((article) => ({
    id: article.slug || article.id,
    title: article.title,
    titleBg: article.titleBg,
    count: article.readTime || '',
    countBg: article.readTimeBg || '',
    image: article.image,
    description: article.subtitle || article.subtitleBg,
    path: articlePath(article),
  }))

  const staticCards = journalContent.collections.map((item) => ({
    ...item,
    path: getArticleBySourceId(item.id)?.path ?? `/discover/${item.id}`,
  }))

  const collections = (
    seriesCards.length > 0
      ? seriesCards
      : discoverCards.length > 0
        ? discoverCards
        : staticCards
  ).slice(0, 3)

  return (
    <section id="discover" className="bg-[#FDFBF7] py-20 md:py-28 px-6 md:px-12 border-t border-b border-[#EAE6DF]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-4">
          <div>
            <span className="text-xs uppercase tracking-[0.3em] font-sans text-[#0C2686] font-medium block mb-2">
              {lang === 'bg' ? 'Селекция от редактора' : "Editor's Picks"}
            </span>
            <h2 className="font-heading text-4xl md:text-5xl text-[#1A1A1A] font-normal">
              {lang === 'bg' ? 'Открийте' : 'Discover'}
            </h2>
          </div>
          <div className="flex flex-col items-start md:items-end gap-3">
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-[#1A1A1A]/50 max-w-xs md:text-right">
              {lang === 'bg'
                ? 'Тематично организирани истории за бавно четене.'
                : 'Thoughtfully grouped long-form stories for slow reading.'}
            </p>
            <ViewAllLink to="/discover" lang={lang} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {collections.map((item, index) => {
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              >
                <Link
                  to={item.path}
                  className="group flex h-full cursor-pointer flex-col justify-between rounded-[16px] border border-[#EAE6DF] bg-white p-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-all duration-500 hover:border-[#0C2686]/30 hover:shadow-[0_10px_30px_rgba(0,0,0,0.07)]"
                >
                  <div>
                    <div className="relative mb-6 h-56 w-full overflow-hidden rounded-xl bg-[#1A1A1A]">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[11px] font-sans font-medium text-[#1A1A1A] backdrop-blur-md">
                        <BookOpen className="size-3 text-[#0C2686]" />
                        <span>{lang === 'bg' ? item.countBg : item.count}</span>
                      </div>
                    </div>

                    <h3 className="mb-3 font-heading text-2xl font-normal text-[#1A1A1A] transition-colors group-hover:text-[#0C2686] md:text-3xl">
                      {lang === 'bg' ? item.titleBg : item.title}
                    </h3>
                    <p className="mb-6 font-sans text-xs font-light leading-relaxed text-[#1A1A1A]/65 md:text-sm">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#EAE6DF]/60 pt-4 text-xs font-sans font-medium uppercase tracking-[0.2em] text-[#0C2686]">
                    <span>{lang === 'bg' ? 'Разгледайте' : 'Explore'}</span>
                    <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
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
