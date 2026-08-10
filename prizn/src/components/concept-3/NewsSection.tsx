import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin } from 'lucide-react'
import { ViewAllLink } from '@/components/concept-3/ViewAllLink'
import {
  articlePath,
  preferApi,
  usePublicArticles,
} from '@/lib/public-content'
import type { CmsArticle } from '@/lib/cms-types'

interface NewsSectionProps {
  lang: 'bg' | 'en'
}

function toNewsCard(article: CmsArticle) {
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

export function NewsSection({ lang }: NewsSectionProps) {
  const { data } = usePublicArticles('news')
  const items = preferApi(data?.map(toNewsCard)).slice(0, 3)

  if (items.length === 0) return null

  return (
    <section id="news" className="border-t border-[#EAE6DF] bg-[#FDFBF7] px-6 py-20 md:px-12 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="mb-2 block font-sans text-xs font-medium uppercase tracking-[0.3em] text-[#0C2686]">
              {lang === 'bg' ? 'Регионът днес' : 'The region today'}
            </span>
            <h2 className="font-heading text-4xl font-light text-[#1A1A1A] md:text-5xl">
              {lang === 'bg' ? 'Новини' : 'News'}
            </h2>
          </div>
          <ViewAllLink to="/news" lang={lang} />
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: index * 0.06 }}
            >
              <Link to={item.path} className="group block">
                <div className="aspect-[16/10] overflow-hidden rounded-[14px] bg-[#1A1A1A]">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={lang === 'bg' ? item.titleBg : item.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <p className="mt-4 font-sans text-[10px] uppercase tracking-[0.2em] text-[#0C2686]">
                  {lang === 'bg' ? item.dateBg : item.date}
                </p>
                <h3 className="mt-2 font-heading text-2xl font-normal text-[#1A1A1A] transition-colors group-hover:text-[#0C2686]">
                  {lang === 'bg' ? item.titleBg : item.title}
                </h3>
                <p className="mt-2 font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/65">
                  {item.excerpt}
                </p>
                {(item.location || item.locationBg) && (
                  <p className="mt-3 inline-flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.18em] text-[#1A1A1A]/45">
                    <MapPin className="size-3 text-[#0C2686]" />
                    {lang === 'bg' ? item.locationBg : item.location}
                  </p>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
