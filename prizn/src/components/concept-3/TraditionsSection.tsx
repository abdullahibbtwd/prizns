import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ViewAllLink } from '@/components/concept-3/ViewAllLink'
import { SectionLoading } from '@/components/concept-3/SectionLoading'
import { SponsoredBadge } from '@/components/concept-3/SponsoredBadge'
import {
  articlePath,
  preferApi,
  usePublicArticles,
} from '@/lib/public-content'
import { toTraditionCard } from '@/lib/section-cards'

interface TraditionsSectionProps {
  lang: 'bg' | 'en'
}

export function TraditionsSection({ lang }: TraditionsSectionProps) {
  const { data, isLoading } = usePublicArticles('traditions')
  const traditions = preferApi(
    data?.map((article) => ({
      ...toTraditionCard(article),
      path: articlePath(article),
    })),
  ).slice(0, 3)

  return (
    <section id="traditions" className="bg-[#FDFBF7] py-16 md:py-24 px-6 md:px-12 border-t border-[#EAE6DF]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="mb-2 block font-sans text-xs font-medium uppercase tracking-[0.3em] text-[#0C2686]">
              {lang === 'bg' ? 'Памет & Култура' : 'Cultural Heritage'}
            </span>
            <h2 className="font-heading text-3xl font-light text-[#1A1A1A] md:text-4xl">
              {lang === 'bg' ? 'Традиции' : 'Traditions'}
            </h2>
          </div>
          <ViewAllLink to="/traditions" lang={lang} />
        </div>

        {isLoading ? (
          <SectionLoading
            lang={lang}
            count={3}
            cardClassName="aspect-[16/11]"
          />
        ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {traditions.map((item, index) => {
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: index * 0.08 }}
              >
                <Link to={item.path} className="group block">
                  <div className="relative mb-4 aspect-[16/11] w-full overflow-hidden rounded-[14px] bg-[#1A1A1A]">
                    <img
                      src={item.image}
                      alt={item.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                    {item.sponsored ? (
                      <div className="absolute left-3 top-3">
                        <SponsoredBadge
                          lang={lang}
                          sponsorName={item.sponsorName}
                          tone="onDark"
                        />
                      </div>
                    ) : null}
                  </div>
                  <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#1A1A1A]/45">
                    {item.sub}
                  </span>
                  <h3 className="mt-1 font-heading text-xl font-normal text-[#1A1A1A] transition-colors group-hover:text-[#0C2686] md:text-2xl">
                    {lang === 'bg' ? item.titleBg : item.title}
                  </h3>
                </Link>
              </motion.div>
            )
          })}
        </div>
        )}
      </div>
    </section>
  )
}
