import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, ChevronRight } from 'lucide-react'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { ListingHeader } from '@/components/concept-3/ListingHeader'
import {
  articlePath,
  usePublicArticles,
  usePublicSeries,
} from '@/lib/public-content'

export default function DiscoverPage() {
  const seriesQuery = usePublicSeries()
  const discoverQuery = usePublicArticles('discover')

  return (
    <JournalShell>
      {({ lang }) => {
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

        const collections =
          seriesCards.length > 0
            ? seriesCards
            : discoverCards.length > 0
              ? discoverCards
              : []

        return (
          <main>
            <ListingHeader
              lang={lang}
              eyebrow={lang === 'bg' ? 'Селекция от редактора' : "Editor's Picks"}
              title={lang === 'bg' ? 'Открийте' : 'Discover'}
              description={
                lang === 'bg'
                  ? 'Всички тематични колекции — дълги истории за бавно четене из Северозападна България.'
                  : 'Every curated collection — long-form stories for slow reading across Northwestern Bulgaria.'
              }
              countLabel={
                lang === 'bg'
                  ? `${collections.length} колекции`
                  : `${collections.length} collections`
              }
            />

            <div className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-20">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {collections.map((item, index) => {
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.06 }}
                    >
                      <Link
                        to={item.path}
                        className="group flex h-full flex-col justify-between rounded-[16px] border border-[#EAE6DF] bg-white p-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-all duration-500 hover:border-[#0C2686]/30 hover:shadow-[0_10px_30px_rgba(0,0,0,0.07)]"
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
                          <h2 className="mb-3 font-heading text-2xl font-normal text-[#1A1A1A] transition-colors group-hover:text-[#0C2686] md:text-3xl">
                            {lang === 'bg' ? item.titleBg : item.title}
                          </h2>
                          <p className="mb-6 font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/65">
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
          </main>
        )
      }}
    </JournalShell>
  )
}
