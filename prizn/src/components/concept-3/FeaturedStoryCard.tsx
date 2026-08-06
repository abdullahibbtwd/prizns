import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, MapPin } from 'lucide-react'
import { journalContent } from '@/data/concept-3/content'
import { getArticleBySourceId } from '@/data/concept-3/articles'
import {
  articlePath,
  preferApi,
  usePublicArticles,
} from '@/lib/public-content'

interface FeaturedStoryCardProps {
  lang: 'bg' | 'en'
}

export function FeaturedStoryCard({ lang }: FeaturedStoryCardProps) {
  const { data } = usePublicArticles('featured')
  const apiStory = preferApi(data, [])[0]
  const fallback = journalContent.featuredStory
  const fallbackHref =
    getArticleBySourceId('featured')?.path ?? '/stories/along-the-walnut-paths'

  const story = apiStory
    ? {
        category: apiStory.category,
        categoryBg: apiStory.categoryBg,
        title: apiStory.title,
        titleBg: apiStory.titleBg,
        subtitle: lang === 'bg' ? apiStory.subtitleBg : apiStory.subtitle,
        readTime: apiStory.readTime,
        readTimeBg: apiStory.readTimeBg,
        author: lang === 'bg' ? apiStory.authorBg : apiStory.author,
        date: lang === 'bg' ? apiStory.dateBg : apiStory.date,
        location: lang === 'bg' ? apiStory.locationBg : apiStory.location,
        image: apiStory.image,
        href: articlePath(apiStory),
      }
    : {
        ...fallback,
        subtitle: fallback.subtitle,
        href: fallbackHref,
      }

  return (
    <section id="featured-story" className="bg-[#FDFBF7] py-20 md:py-32 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.3em] font-sans text-[#1A1A1A]/50">
            {lang === 'bg' ? 'Водещ Разказ' : 'Featured Editorial'}
          </span>
          <span className="text-xs uppercase tracking-[0.25em] font-sans text-[#0C2686]">
            {story.date}
          </span>
        </div>

        <Link to={story.href} className="block">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="group relative overflow-hidden rounded-[16px] border border-[#EAE6DF] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] transition-all duration-500 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
              <div className="lg:col-span-7 relative min-h-[380px] sm:min-h-[480px] lg:min-h-[580px] overflow-hidden bg-[#1A1A1A]">
                <motion.img
                  src={story.image}
                  alt={story.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
                <div className="absolute bottom-6 left-6 flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-md px-3.5 py-1.5 text-xs text-[#1A1A1A] font-sans font-medium">
                  <MapPin className="size-3.5 text-[#0C2686]" />
                  <span>{story.location}</span>
                </div>
              </div>

              <div className="lg:col-span-5 p-8 md:p-12 lg:p-16 flex flex-col justify-between bg-white">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <span className="inline-block px-3 py-1 bg-[#F5F2EB] text-[#0C2686] text-[11px] font-sans uppercase tracking-[0.2em] font-medium rounded-full">
                      {lang === 'bg' ? story.categoryBg : story.category}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-[#1A1A1A]/50 font-sans">
                      <Clock className="size-3" />
                      {lang === 'bg' ? story.readTimeBg : story.readTime}
                    </span>
                  </div>

                  <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl text-[#1A1A1A] font-normal leading-[1.15] mb-6 group-hover:text-[#0C2686] transition-colors duration-300">
                    {lang === 'bg' ? story.titleBg : story.title}
                  </h2>

                  <p className="font-sans text-sm md:text-base text-[#1A1A1A]/70 font-light leading-relaxed mb-8">
                    {story.subtitle}
                  </p>
                </div>

                <div className="pt-6 border-t border-[#EAE6DF] flex items-center justify-between">
                  <div>
                    <span className="block font-sans text-xs text-[#1A1A1A]/40 uppercase tracking-widest">
                      {lang === 'bg' ? 'Автор' : 'Author'}
                    </span>
                    <span className="font-heading text-base text-[#1A1A1A]">
                      {story.author}
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-2 font-sans text-xs uppercase tracking-[0.25em] font-medium text-[#0C2686] group-hover:translate-x-1 transition-transform duration-300">
                    <span>{lang === 'bg' ? 'Прочетете →' : 'Read Story →'}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </Link>
      </div>
    </section>
  )
}
