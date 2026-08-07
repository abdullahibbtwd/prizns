import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, MapPin } from 'lucide-react'
import { ViewAllLink } from '@/components/concept-3/ViewAllLink'
import {
  articlePath,
  preferApi,
  usePublicArticles,
} from '@/lib/public-content'
import type { CmsArticle } from '@/lib/cms-types'

interface SportsSectionProps {
  lang: 'bg' | 'en'
}

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

export function SportsSection({ lang }: SportsSectionProps) {
  const { data } = usePublicArticles('sports')
  const items = preferApi(data?.map(toSportsCard)).slice(0, 3)

  return (
    <section id="sports" className="border-t border-[#EAE6DF] bg-[#FDFBF7] px-6 py-20 md:px-12 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="mb-2 block font-sans text-xs font-medium uppercase tracking-[0.3em] text-[#0C2686]">
              {lang === 'bg' ? 'Движение & Място' : 'Movement & Place'}
            </span>
            <h2 className="font-heading text-4xl font-light text-[#1A1A1A] md:text-5xl">
              {lang === 'bg' ? 'Спорт' : 'Sports'}
            </h2>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <p className="max-w-xs font-sans text-xs uppercase tracking-[0.2em] text-[#1A1A1A]/50 md:text-right">
              {lang === 'bg'
                ? 'Речни пробези, скали и терени — спортът като местна принадлежност.'
                : 'River runs, rock, and pitches — sport as belonging to place.'}
            </p>
            <ViewAllLink to="/sports" lang={lang} />
          </div>
        </div>

        <div className="flex flex-col gap-8">
          {items.map((item, index) => {
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: index * 0.08 }}
              >
                <Link
                  to={item.path}
                  className="group grid grid-cols-1 items-center gap-6 border-b border-[#EAE6DF] pb-8 last:border-b-0 md:grid-cols-12 md:gap-10 md:pb-10"
                >
                  <div className="relative aspect-[16/10] overflow-hidden rounded-[14px] bg-[#1A1A1A] md:col-span-5">
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
                    <h3 className="mt-2 font-heading text-2xl font-normal text-[#1A1A1A] transition-colors group-hover:text-[#0C2686] md:text-3xl">
                      {lang === 'bg' ? item.titleBg : item.title}
                    </h3>
                    <p className="mt-3 max-w-xl font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/65 md:text-base">
                      {item.excerpt}
                    </p>
                    <div className="mt-5 flex items-center justify-between gap-4">
                      <span className="inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.18em] text-[#1A1A1A]/45">
                        <MapPin className="size-3 text-[#0C2686]" />
                        {lang === 'bg' ? item.locationBg : item.location}
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-[#0C2686]">
                        {lang === 'bg' ? 'Прочетете' : 'Read'}
                        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
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
