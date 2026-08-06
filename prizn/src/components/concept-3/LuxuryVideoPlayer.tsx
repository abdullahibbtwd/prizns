import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Play, X } from 'lucide-react'
import {
  getRemotePosterUrl,
  resolveVideoPlayback,
} from '@/lib/video-playback'
import { cn } from '@/lib/utils'

type LuxuryVideoPlayerProps = {
  src?: string | null
  poster?: string
  title?: string
  className?: string
  /** Aspect frame classes */
  aspectClassName?: string
  /** Dark cinema chrome (landing) vs light article chrome */
  tone?: 'cinema' | 'editorial'
  /** Controlled playing state (optional) */
  playing?: boolean
  onPlayingChange?: (playing: boolean) => void
  /** Compact play affordance for side cards */
  size?: 'featured' | 'card'
}

export function LuxuryVideoPlayer({
  src,
  poster = '',
  title = '',
  className,
  aspectClassName = 'aspect-video',
  tone = 'cinema',
  playing: controlledPlaying,
  onPlayingChange,
  size = 'featured',
}: LuxuryVideoPlayerProps) {
  const reactId = useId()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [internalPlaying, setInternalPlaying] = useState(false)
  const playing =
    controlledPlaying !== undefined ? controlledPlaying : internalPlaying
  const playback = resolveVideoPlayback(src)
  const resolvedPoster = poster || getRemotePosterUrl(src) || ''

  const setPlaying = (next: boolean) => {
    if (controlledPlaying === undefined) setInternalPlaying(next)
    onPlayingChange?.(next)
  }

  useEffect(() => {
    if (!playing && videoRef.current) {
      videoRef.current.pause()
    }
  }, [playing])

  const canPlay = Boolean(playback)
  const isDark = tone === 'cinema'

  return (
    <div
      className={cn(
        'group relative overflow-hidden bg-black',
        aspectClassName,
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {playing && playback ? (
          <motion.div
            key="player"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0"
          >
            {playback.kind === 'file' ? (
              <video
                ref={videoRef}
                className="h-full w-full object-contain bg-black"
                src={playback.src}
                controls
                playsInline
                autoPlay
                poster={resolvedPoster || undefined}
                title={title}
              />
            ) : (
              <iframe
                title={title || 'Video'}
                src={playback.embedUrl}
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            )}

            <button
              type="button"
              onClick={() => setPlaying(false)}
              className={cn(
                'absolute right-3 top-3 z-10 inline-flex size-9 items-center justify-center rounded-full border backdrop-blur-md transition-colors',
                isDark
                  ? 'border-white/25 bg-black/50 text-white hover:bg-black/70'
                  : 'border-[#EAE6DF] bg-white/90 text-[#1A1A1A] hover:bg-white',
              )}
              aria-label="Close video"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="poster"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 cursor-pointer text-left"
            onClick={() => {
              if (canPlay) setPlaying(true)
            }}
            disabled={!canPlay}
            aria-label={title ? `Play ${title}` : 'Play video'}
          >
            {resolvedPoster ? (
              <img
                src={resolvedPoster}
                alt={title}
                className="h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-[#0C2686]/40 via-black to-black" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

            <span
              className={cn(
                'absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur-md transition-transform duration-300 group-hover:scale-110',
                size === 'featured'
                  ? 'size-16 border-white/40 bg-white/15'
                  : 'size-10 border-white/35 bg-white/12',
                !canPlay && 'opacity-40',
              )}
            >
              <Play
                className={cn(
                  'ml-0.5 fill-white text-white',
                  size === 'featured' ? 'size-6' : 'size-3.5',
                )}
              />
            </span>

            {!canPlay && (
              <span className="absolute inset-x-0 bottom-3 px-4 text-center font-sans text-[10px] uppercase tracking-[0.2em] text-white/55">
                Video coming soon
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Keep one active player annotation for a11y */}
      <span id={reactId} className="sr-only">
        {title}
      </span>
    </div>
  )
}
