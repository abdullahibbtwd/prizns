import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { ViewAllLink } from '@/components/concept-3/ViewAllLink'
import {
  articlePath,
  preferApi,
  usePublicArticles,
} from '@/lib/public-content'
import type { CmsArticle } from '@/lib/cms-types'

interface CampaignsSectionProps {
  lang: 'bg' | 'en'
}

function toCampaignsCard(article: CmsArticle) {
  return {
    id: article.slug || article.id,
    title: article.title || article.titleBg,
    titleBg: article.titleBg,
    status: article.category || '',
    statusBg: article.categoryBg || '',
    image: article.image || '',
    excerpt: article.subtitle || article.subtitleBg || '',
    path: articlePath(article),
  }
}

export function CampaignsSection({ lang }: CampaignsSectionProps) {
  const { data } = usePublicArticles('campaigns')
  const items = preferApi(data?.map(toCampaignsCard))
  const [featured, ...rest] = items
  const side = rest.slice(0, 2)

  return (
    <section id="campaigns" className="border-t border-[#EAE6DF] bg-[#FDFBF7] px-6 py-20 md:px-12 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="mb-2 block font-sans text-xs font-medium uppercase tracking-[0.3em] text-[#0C2686]">
              {lang === 'bg' ? 'Действайте с нас' : 'Act with us'}
            </span>
            <h2 className="font-heading text-4xl font-light text-[#1A1A1A] md:text-5xl">
              {lang === 'bg' ? 'Кампании' : 'Campaigns'}
            </h2>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <p className="max-w-sm font-sans text-xs uppercase tracking-[0.2em] text-[#1A1A1A]/50 md:text-right">
              {lang === 'bg'
                ? 'Дългосрочни каузи за памет, занаят и език.'
                : 'Long-form causes for memory, craft, and language.'}
            </p>
            <ViewAllLink to="/campaigns" lang={lang} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {featured && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.75 }}
              className="lg:col-span-7"
            >
              <Link
                to={featured.path}
                className="group relative block min-h-[420px] overflow-hidden rounded-[16px] bg-[#1A1A1A] md:min-h-[480px]"
              >
                <img
                  src={featured.image}
                  alt={lang === 'bg' ? featured.titleBg : featured.title}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-10">
                  <span className="font-sans text-[11px] uppercase tracking-[0.22em] text-white/70">
                    {lang === 'bg' ? featured.statusBg : featured.status}
                  </span>
                  <h3 className="mt-3 font-heading text-3xl font-light text-white md:text-5xl">
                    {lang === 'bg' ? featured.titleBg : featured.title}
                  </h3>
                  <p className="mt-4 max-w-lg font-sans text-sm font-light leading-relaxed text-white/75 md:text-base">
                    {featured.excerpt}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 font-sans text-xs font-medium uppercase tracking-[0.22em] text-white">
                    {lang === 'bg' ? 'Научете повече' : 'Learn more'}
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </motion.div>
          )}

          <div className="flex flex-col gap-8 lg:col-span-5">
            {side.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.65, delay: 0.08 + index * 0.08 }}
              >
                <Link to={item.path} className="group block">
                  <div className="aspect-[16/10] overflow-hidden rounded-[14px] bg-[#1A1A1A]">
                    <img
                      src={item.image}
                      alt={lang === 'bg' ? item.titleBg : item.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <span className="mt-4 block font-sans text-[10px] uppercase tracking-[0.22em] text-[#0C2686]">
                    {lang === 'bg' ? item.statusBg : item.status}
                  </span>
                  <h3 className="mt-1 font-heading text-2xl font-normal text-[#1A1A1A] transition-colors group-hover:text-[#0C2686]">
                    {lang === 'bg' ? item.titleBg : item.title}
                  </h3>
                  <p className="mt-2 font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/60">
                    {item.excerpt}
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
