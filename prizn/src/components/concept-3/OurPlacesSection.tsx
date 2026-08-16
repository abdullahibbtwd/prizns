import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { ViewAllLink } from '@/components/concept-3/ViewAllLink'
import { SponsoredBadge } from '@/components/concept-3/SponsoredBadge'
import { RegionMap } from '@/components/concept-3/RegionMap'
import {
  articlePath,
  preferApi,
  usePublicArticles,
} from '@/lib/public-content'
import { toPlaceCard } from '@/lib/section-cards'

interface OurPlacesSectionProps {
  lang: 'bg' | 'en'
}

export function OurPlacesSection({ lang }: OurPlacesSectionProps) {
  const navigate = useNavigate()
  const { data } = usePublicArticles('places')
  const places = preferApi(
    data?.map((article) => ({
      ...toPlaceCard(article),
      path: articlePath(article),
    })),
  ).slice(0, 2)

  return (
    <section id="places" className="bg-[#FDFBF7] py-24 md:py-36 px-6 md:px-12 border-t border-[#EAE6DF]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16 flex flex-col items-center gap-4 text-center">
          <div>
            <span className="mb-2 block font-sans text-xs font-medium uppercase tracking-[0.3em] text-[#0C2686]">
              {lang === 'bg' ? 'География' : 'Geography'}
            </span>
            <h2 className="font-heading text-4xl font-light text-[#1A1A1A] md:text-5xl">
              {lang === 'bg' ? 'Открийте региона' : 'Explore the Region'}
            </h2>
          </div>
          <ViewAllLink to="/places" lang={lang} />
        </div>

        <p className="mb-6 text-center font-sans text-sm font-light text-[#1A1A1A]/55">
          {lang === 'bg'
            ? 'Изберете град или село, за да видите историите оттам. Същата карта има и при Места и Традиции.'
            : 'Click a town or village to see stories from that place. The same map is on Places and Traditions.'}
        </p>
        <RegionMap
          className="mb-12"
          onSelect={(slug) =>
            navigate(`/stories?location=${encodeURIComponent(slug)}`)
          }
        />

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {places.map((place, index) => {
            return (
              <motion.div
                key={place.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.15 }}
              >
                <Link
                  to={place.path}
                  className="group relative block h-[480px] overflow-hidden rounded-[16px] border border-[#EAE6DF] bg-[#1A1A1A] shadow-[0_4px_24px_rgba(0,0,0,0.03)] transition-all duration-500 hover:shadow-[0_12px_40px_rgba(0,0,0,0.09)] md:h-[540px]"
                >
                  <img
                    src={place.image}
                    alt={place.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-between p-8 text-white md:p-12">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-sans text-xs uppercase tracking-[0.3em] text-white/70">
                          {place.readTime}
                        </span>
                        {place.sponsored ? (
                          <SponsoredBadge
                            lang={lang}
                            sponsorName={place.sponsorName}
                            tone="onDark"
                          />
                        ) : null}
                      </div>
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/30 text-white backdrop-blur-md transition-all duration-300 group-hover:bg-white group-hover:text-[#1A1A1A]">
                        <ArrowUpRight className="size-5 stroke-[1.5]" />
                      </div>
                    </div>
                    <div>
                      <h3 className="mb-3 font-heading text-4xl font-light text-white md:text-5xl">
                        {lang === 'bg' ? place.nameBg : place.name}
                      </h3>
                      <p className="mb-6 max-w-md font-sans text-sm font-light leading-relaxed text-white/80 md:text-base">
                        {lang === 'bg' ? place.subBg : place.sub}
                      </p>
                      <span className="inline-flex items-center gap-2 font-sans text-xs font-medium uppercase tracking-[0.25em] text-white transition-colors group-hover:text-[#FBDA61]">
                        <span>{lang === 'bg' ? place.actionBg : place.action}</span>
                        <span className="text-lg">→</span>
                      </span>
                    </div>
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
