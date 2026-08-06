import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { journalContent } from '@/data/concept-3/content'
import { getArticleBySourceId } from '@/data/concept-3/articles'
import { ViewAllLink } from '@/components/concept-3/ViewAllLink'
import { LuxuryVideoPlayer } from '@/components/concept-3/LuxuryVideoPlayer'
import {
  articlePath,
  preferApi,
  usePublicArticles,
} from '@/lib/public-content'
import type { CmsArticle } from '@/lib/cms-types'

interface VideoSectionProps {
  lang: 'bg' | 'en'
}

function toVideoCard(article: CmsArticle) {
  return {
    id: article.slug || article.id,
    title: article.title || article.titleBg,
    titleBg: article.titleBg,
    duration: article.audioDuration || article.readTime || '',
    location: article.location || '',
    locationBg: article.locationBg || '',
    image: article.image || '',
    excerpt: article.subtitle || article.subtitleBg || '',
    path: articlePath(article),
    videoUrl: article.videoUrl || '',
  }
}

export function VideoSection({ lang }: VideoSectionProps) {
  const { data } = usePublicArticles('video')
  const items = preferApi(
    data?.map(toVideoCard),
    journalContent.video.map((item) => ({
      ...item,
      path: getArticleBySourceId(item.id)?.path ?? `/video/${item.id}`,
      videoUrl: '',
    })),
  )
  const [featured, ...rest] = items
  const side = rest.slice(0, 2)
  const [activeId, setActiveId] = useState<string | null>(null)

  return (
    <section id="video" className="relative overflow-hidden bg-[#1A1A1A] px-6 py-24 text-white md:px-12 md:py-32">
      <div
        className="pointer-events-none absolute left-0 top-1/3 h-80 w-80 -translate-x-1/3 rounded-full bg-[#0C2686]/25 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="mb-2 block font-sans text-xs font-medium uppercase tracking-[0.3em] text-[#9FACE6]">
              {lang === 'bg' ? 'Филмов отдел' : 'Film desk'}
            </span>
            <h2 className="font-heading text-4xl font-light md:text-5xl">
              {lang === 'bg' ? 'Видео' : 'Video'}
            </h2>
            <p className="mt-3 max-w-md font-sans text-xs font-light uppercase tracking-[0.16em] text-white/45">
              {lang === 'bg'
                ? 'Къси филми от ателиета, пътеки и речни пресичания.'
                : 'Short films from workshops, trails, and river crossings.'}
            </p>
          </div>
          <ViewAllLink
            to="/video"
            lang={lang}
            className="text-[#9FACE6] hover:text-white hover:opacity-100"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          {featured && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.75 }}
              className="lg:col-span-7"
            >
              <div className="relative overflow-hidden rounded-[16px]">
                <LuxuryVideoPlayer
                  src={featured.videoUrl}
                  poster={featured.image}
                  title={lang === 'bg' ? featured.titleBg : featured.title}
                  aspectClassName="aspect-[16/10]"
                  size="featured"
                  tone="cinema"
                  playing={activeId === featured.id}
                  onPlayingChange={(playing) =>
                    setActiveId(playing ? featured.id : null)
                  }
                />
                {activeId !== featured.id && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6 md:p-8">
                    <span className="font-sans text-[11px] uppercase tracking-[0.22em] text-white/65">
                      {featured.duration}
                      {' · '}
                      {lang === 'bg' ? featured.locationBg : featured.location}
                    </span>
                    <h3 className="mt-2 font-heading text-3xl font-light md:text-4xl">
                      {lang === 'bg' ? featured.titleBg : featured.title}
                    </h3>
                    <Link
                      to={featured.path}
                      className="pointer-events-auto mt-3 inline-block font-sans text-[11px] uppercase tracking-[0.2em] text-[#9FACE6] underline-offset-4 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {lang === 'bg' ? 'Пълна история' : 'Full story'}
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          <div className="flex flex-col gap-6 lg:col-span-5">
            {side.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.65, delay: 0.1 + index * 0.08 }}
                className="grid grid-cols-1 gap-4 sm:grid-cols-[160px_1fr] sm:gap-5"
              >
                <LuxuryVideoPlayer
                  src={item.videoUrl}
                  poster={item.image}
                  title={lang === 'bg' ? item.titleBg : item.title}
                  aspectClassName="aspect-[4/3] sm:aspect-[4/3]"
                  size="card"
                  tone="cinema"
                  className="rounded-[12px]"
                  playing={activeId === item.id}
                  onPlayingChange={(playing) =>
                    setActiveId(playing ? item.id : null)
                  }
                />
                <div className="flex flex-col justify-center">
                  <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-[#9FACE6]">
                    {item.duration}
                  </span>
                  <h3 className="mt-1 font-heading text-xl font-normal md:text-2xl">
                    <Link
                      to={item.path}
                      className="transition-colors hover:text-[#9FACE6]"
                    >
                      {lang === 'bg' ? item.titleBg : item.title}
                    </Link>
                  </h3>
                  <p className="mt-2 line-clamp-2 font-sans text-sm font-light leading-relaxed text-white/55">
                    {item.excerpt}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
