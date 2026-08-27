import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { ListingHeader } from '@/components/concept-3/ListingHeader'
import { LandingCategoryFilters } from '@/components/concept-3/ListingFilters'
import {
  articlePath,
  preferApi,
  usePublicArticles,
} from '@/lib/public-content'
import { useListingFilters } from '@/lib/listing-filters'
import type { CmsArticle } from '@/lib/cms-types'

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

export default function CampaignsPage() {
  const { category, setFilters } = useListingFilters()
  const { data } = usePublicArticles('campaigns', {
    categorySlug: category || undefined,
  })

  return (
    <JournalShell>
      {({ lang }) => {
        const items = preferApi(data?.map(toCampaignsCard))

        return (
          <main>
            <ListingHeader
              lang={lang}
              eyebrow={lang === 'bg' ? 'Действайте с нас' : 'Act with us'}
              title={lang === 'bg' ? 'Кампании' : 'Campaigns'}
              description={
                lang === 'bg'
                  ? 'Каузи за читалища, занаят, пътеки и диалекти — дълга грижа за региона.'
                  : 'Causes for reading rooms, craft, trails, and dialects — long care for the region.'
              }
              countLabel={
                lang === 'bg' ? `${items.length} кампании` : `${items.length} campaigns`
              }
            />

            <LandingCategoryFilters
              lang={lang}
              landing="campaigns"
              category={category}
              onChange={(value) => setFilters({ category: value })}
            />

            <div className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-20">
              <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
                {items.map((item, index) => {
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.06 }}
                    >
                      <Link to={item.path} className="group block">
                        <div className="aspect-[16/10] overflow-hidden rounded-[14px] bg-[#1A1A1A]">
                          <img
                            src={item.image}
                            alt={lang === 'bg' ? item.titleBg : item.title}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        </div>
                        <span className="mt-4 block font-sans text-[10px] uppercase tracking-[0.22em] text-[#0C2686]">
                          {lang === 'bg' ? item.statusBg : item.status}
                        </span>
                        <h2 className="mt-2 font-heading text-2xl font-normal text-[#1A1A1A] transition-colors group-hover:text-[#0C2686] md:text-3xl">
                          {lang === 'bg' ? item.titleBg : item.title}
                        </h2>
                        <p className="mt-2 font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/60">
                          {item.excerpt}
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
