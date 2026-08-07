import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { ListingHeader } from '@/components/concept-3/ListingHeader'
import {
  articlePath,
  preferApi,
  usePublicArticles,
} from '@/lib/public-content'
import { toPlaceCard } from '@/lib/section-cards'

export default function PlacesPage() {
  const { data } = usePublicArticles('places')

  return (
    <JournalShell>
      {({ lang }) => {
        const places = preferApi(
          data?.map((article) => ({
            ...toPlaceCard(article),
            path: articlePath(article),
          })),
        )

        return (
          <main>
            <ListingHeader
              lang={lang}
              eyebrow={lang === 'bg' ? 'География' : 'Geography'}
              title={lang === 'bg' ? 'Нашите места' : 'Our Places'}
              description={
                lang === 'bg'
                  ? 'Градове, села и пътеки из Северозапада — местата, в които живеят историите.'
                  : 'Towns, villages, and trails across the Northwest — the places where our stories live.'
              }
              countLabel={
                lang === 'bg' ? `${places.length} места` : `${places.length} places`
              }
            />

            <div className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-20">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                {places.map((place, index) => {
                  return (
                    <motion.div
                      key={place.id}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.7, delay: index * 0.08 }}
                    >
                      <Link
                        to={place.path}
                        className="group relative block h-[420px] overflow-hidden rounded-[16px] border border-[#EAE6DF] bg-[#1A1A1A] shadow-[0_4px_24px_rgba(0,0,0,0.03)] transition-all duration-500 hover:shadow-[0_12px_40px_rgba(0,0,0,0.09)] md:h-[480px]"
                      >
                        <img
                          src={place.image}
                          alt={place.name}
                          className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                        <div className="absolute inset-0 flex flex-col justify-between p-8 text-white md:p-12">
                          <div className="flex items-center justify-between">
                            <span className="font-sans text-xs uppercase tracking-[0.3em] text-white/70">
                              {place.readTime}
                            </span>
                            <div className="flex size-10 items-center justify-center rounded-full border border-white/30 text-white backdrop-blur-md transition-all duration-300 group-hover:bg-white group-hover:text-[#1A1A1A]">
                              <ArrowUpRight className="size-5 stroke-[1.5]" />
                            </div>
                          </div>
                          <div>
                            <h2 className="mb-3 font-heading text-4xl font-light text-white md:text-5xl">
                              {lang === 'bg' ? place.nameBg : place.name}
                            </h2>
                            <p className="mb-3 max-w-md font-sans text-sm font-light leading-relaxed text-white/80 md:text-base">
                              {lang === 'bg' ? place.subBg : place.sub}
                            </p>
                            <p className="max-w-md font-sans text-xs font-light leading-relaxed text-white/55">
                              {place.detail}
                            </p>
                          </div>
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
