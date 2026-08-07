import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { ListingHeader } from '@/components/concept-3/ListingHeader'
import {
  articlePath,
  preferApi,
  usePublicArticles,
} from '@/lib/public-content'
import { toTraditionCard } from '@/lib/section-cards'

export default function TraditionsPage() {
  const { data } = usePublicArticles('traditions')

  return (
    <JournalShell>
      {({ lang }) => {
        const traditions = preferApi(
          data?.map((article) => ({
            ...toTraditionCard(article),
            path: articlePath(article),
          })),
        )

        return (
          <main>
            <ListingHeader
              lang={lang}
              eyebrow={lang === 'bg' ? 'Памет & Култура' : 'Cultural Heritage'}
              title={lang === 'bg' ? 'Традиции' : 'Traditions'}
              description={
                lang === 'bg'
                  ? 'Живи обичаи, занаяти и ритуали — паметта, която регионът все още пази в ръцете си.'
                  : 'Living customs, crafts, and rituals — the memory the region still holds in its hands.'
              }
              countLabel={
                lang === 'bg'
                  ? `${traditions.length} традиции`
                  : `${traditions.length} traditions`
              }
            />

            <div className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-20">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {traditions.map((item, index) => {
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.06 }}
                    >
                      <Link to={item.path} className="group block text-left">
                        <div className="relative mb-4 aspect-[16/11] w-full overflow-hidden rounded-[14px] bg-[#1A1A1A]">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                        </div>
                        <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#1A1A1A]/45">
                          {item.sub}
                        </span>
                        <h2 className="mt-1 font-heading text-xl font-normal text-[#1A1A1A] transition-colors group-hover:text-[#0C2686] md:text-2xl">
                          {lang === 'bg' ? item.titleBg : item.title}
                        </h2>
                        <p className="mt-2 font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/60">
                          {item.description}
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
