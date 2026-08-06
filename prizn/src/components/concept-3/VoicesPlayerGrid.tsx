import { useState, useRef, type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, Volume2, Headphones, Sparkles, ArrowUpRight } from 'lucide-react'
import { getArticleBySourceId } from '@/data/concept-3/articles'
import { articlePath } from '@/lib/public-content'
import type { CmsArticle } from '@/lib/cms-types'

export type VoiceItem = {
  id: string
  title: string
  titleBg: string
  speaker: string
  speakerBg: string
  duration: string
  audioUrl: string
  quote: string
  image: string
  path?: string
}

export function toVoiceItem(article: CmsArticle): VoiceItem {
  return {
    id: article.slug || article.id,
    title: article.title || article.titleBg,
    titleBg: article.titleBg,
    speaker: article.speaker || article.author || '',
    speakerBg: article.speakerBg || article.authorBg || '',
    duration: article.audioDuration || article.readTime || '',
    audioUrl: article.audioUrl || '',
    quote: article.subtitle || article.subtitleBg || '',
    image: article.image || '',
    path: articlePath(article),
  }
}

interface VoicesPlayerGridProps {
  lang: 'bg' | 'en'
  voices: readonly VoiceItem[]
  /** Use whileInView on landing; animate on mount for listing page */
  animateOnMount?: boolean
}

export function VoicesPlayerGrid({
  lang,
  voices,
  animateOnMount = false,
}: VoicesPlayerGridProps) {
  const navigate = useNavigate()
  const [activeVoiceId, setActiveVoiceId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const activeVoice = voices.find((v) => v.id === activeVoiceId) || voices[0]

  const getHref = (voice: VoiceItem) =>
    voice.path ?? getArticleBySourceId(voice.id)?.path ?? `/voices/${voice.id}`

  const togglePlay = (event: MouseEvent, id: string) => {
    event.preventDefault()
    event.stopPropagation()

    if (activeVoiceId === id && isPlaying) {
      setIsPlaying(false)
      audioRef.current?.pause()
    } else {
      setActiveVoiceId(id)
      setIsPlaying(true)
      // Wait a tick so src updates when switching tracks
      window.setTimeout(() => {
        audioRef.current?.play().catch(() => setIsPlaying(true))
      }, 0)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {voices.map((item, index) => {
          const isThisPlaying = activeVoiceId === item.id && isPlaying
          const href = getHref(item)

          return (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 24 }}
              {...(animateOnMount
                ? { animate: { opacity: 1, y: 0 } }
                : {
                    whileInView: { opacity: 1, y: 0 },
                    viewport: { once: true },
                  })}
              transition={{ duration: 0.7, delay: index * 0.08 }}
              role="link"
              tabIndex={0}
              onClick={() => navigate(href)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  navigate(href)
                }
              }}
              className={`group flex cursor-pointer flex-col justify-between rounded-[16px] border p-6 backdrop-blur-md transition-all duration-500 outline-none focus-visible:ring-2 focus-visible:ring-[#0C2686]/50 ${
                isThisPlaying
                  ? 'border-[#0C2686] bg-black/80 ring-2 ring-[#0C2686]/40'
                  : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/[0.07]'
              }`}
            >
              <div>
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors group-hover:bg-[#0C2686]/40">
                    <Headphones className="size-5 stroke-[1.5]" />
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 font-sans text-xs uppercase tracking-widest text-white/60">
                    {item.duration}
                  </span>
                </div>

                <span className="mb-1 block font-sans text-xs uppercase tracking-[0.2em] text-[#4051C7]">
                  {lang === 'bg' ? item.speakerBg : item.speaker}
                </span>
                <h3 className="mb-3 font-heading text-2xl font-normal text-white transition-colors group-hover:text-[#9FACE6] md:text-3xl">
                  {lang === 'bg' ? item.titleBg : item.title}
                </h3>

                <p className="mb-4 font-sans text-xs font-light italic leading-relaxed text-white/70 md:text-sm">
                  "{item.quote}"
                </p>

                <Link
                  to={href}
                  onClick={(event) => event.stopPropagation()}
                  className="mb-6 inline-flex items-center gap-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-[#9FACE6] transition-colors hover:text-white"
                >
                  {lang === 'bg' ? 'Отворете пълната история' : 'Open full story'}
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-4">
                <div className="flex h-6 items-center gap-1">
                  {[40, 75, 30, 90, 50, 80, 45, 60, 35].map((height, i) => (
                    <motion.div
                      key={i}
                      animate={
                        isThisPlaying
                          ? { height: ['20%', '100%', '30%', '90%'] }
                          : { height: `${height}%` }
                      }
                      transition={
                        isThisPlaying
                          ? {
                              duration: 0.6,
                              repeat: Infinity,
                              repeatType: 'reverse',
                              delay: i * 0.08,
                            }
                          : {}
                      }
                      className={`w-1 rounded-full ${isThisPlaying ? 'bg-[#0C2686]' : 'bg-white/30'}`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={(event) => togglePlay(event, item.id)}
                  className={`flex items-center gap-2 rounded-full px-5 py-2.5 font-sans text-xs font-medium uppercase tracking-widest transition-all duration-300 ${
                    isThisPlaying
                      ? 'bg-[#0C2686] text-white shadow-lg shadow-[#0C2686]/50'
                      : 'bg-white text-[#1A1A1A] hover:bg-[#0C2686] hover:text-white'
                  }`}
                >
                  {isThisPlaying ? (
                    <>
                      <Pause className="size-3.5 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="size-3.5 fill-current" />
                      <span>Play Story</span>
                    </>
                  )}
                </button>
              </div>
            </motion.article>
          )
        })}
      </div>

      <audio
        ref={audioRef}
        src={activeVoice?.audioUrl}
        onEnded={() => setIsPlaying(false)}
      />

      <AnimatePresence>
        {isPlaying && activeVoice && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-6 right-6 z-50 flex items-center justify-between gap-4 rounded-full border border-white/20 bg-[#1A1A1A]/95 px-6 py-3 text-white shadow-2xl backdrop-blur-xl md:left-1/2 md:max-w-xl md:-translate-x-1/2"
          >
            <button
              type="button"
              onClick={() => navigate(getHref(activeVoice))}
              className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden text-left"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#0C2686]">
                <Sparkles className="size-4 animate-spin text-white" />
              </div>
              <div className="truncate">
                <p className="truncate font-heading text-sm text-white">
                  {lang === 'bg' ? activeVoice.titleBg : activeVoice.title}
                </p>
                <p className="truncate font-sans text-[10px] uppercase tracking-widest text-white/50">
                  {lang === 'bg' ? activeVoice.speakerBg : activeVoice.speaker}
                  {' · '}
                  {lang === 'bg' ? 'Отворете' : 'Open'}
                </p>
              </div>
            </button>

            <div className="flex shrink-0 items-center gap-3">
              <Volume2 className="hidden size-4 text-white/70 sm:block" />
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false)
                  audioRef.current?.pause()
                }}
                className="flex size-8 items-center justify-center rounded-full bg-white text-[#1A1A1A] transition-transform hover:scale-105"
              >
                <Pause className="size-4 fill-current" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
