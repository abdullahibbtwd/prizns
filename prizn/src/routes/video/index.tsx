import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { JournalShell } from '@/components/concept-3/JournalShell'
import { ListingHeader } from '@/components/concept-3/ListingHeader'
import { LuxuryVideoPlayer } from '@/components/concept-3/LuxuryVideoPlayer'
import {
  articlePath,
  preferApi,
  usePublicArticles,
} from '@/lib/public-content'
import type { CmsArticle } from '@/lib/cms-types'

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

export default function VideoPage() {
  const { data } = usePublicArticles('video')
  const [activeId, setActiveId] = useState<string | null>(null)

  return (
    <JournalShell>
      {({ lang }) => {
        const items = preferApi(data?.map(toVideoCard))

        return (
          <main>
            <ListingHeader
              lang={lang}
              eyebrow={lang === 'bg' ? 'Филмов отдел' : 'Film desk'}
              title={lang === 'bg' ? 'Видео' : 'Video'}
              description={
                lang === 'bg'
                  ? 'Къси филми от ателиета, пътеки и речни пресичания — кадърът като теренна бележка.'
                  : 'Short films from workshops, trails, and river crossings — the frame as a field note.'
              }
              countLabel={
                lang === 'bg' ? `${items.length} видеа` : `${items.length} films`
              }
            />

            <div className="mx-auto max-w-7xl px-6 py-16 md:px-12 md:py-20">
              <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
                {items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.06 }}
                    className="space-y-4"
                  >
                    <LuxuryVideoPlayer
                      src={item.videoUrl}
                      poster={item.image}
                      title={lang === 'bg' ? item.titleBg : item.title}
                      aspectClassName="aspect-[16/10]"
                      className="rounded-[14px]"
                      size="featured"
                      tone="cinema"
                      playing={activeId === item.id}
                      onPlayingChange={(playing) =>
                        setActiveId(playing ? item.id : null)
                      }
                    />
                    <div>
                      <span className="font-sans text-[11px] uppercase tracking-[0.2em] text-[#0C2686]/70">
                        {item.duration}
                        {item.location
                          ? ` · ${lang === 'bg' ? item.locationBg : item.location}`
                          : ''}
                      </span>
                      <h2 className="mt-2 font-heading text-2xl font-normal text-[#1A1A1A] md:text-3xl">
                        <Link
                          to={item.path}
                          className="transition-colors hover:text-[#0C2686]"
                        >
                          {lang === 'bg' ? item.titleBg : item.title}
                        </Link>
                      </h2>
                      <p className="mt-2 font-sans text-sm font-light leading-relaxed text-[#1A1A1A]/60">
                        {item.excerpt}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </main>
        )
      }}
    </JournalShell>
  )
}
