/**
 * Resolve YouTube / Vimeo / direct file URLs into a playback descriptor.
 */

export type VideoPlayback =
  | { kind: 'youtube'; id: string; embedUrl: string; watchUrl: string }
  | { kind: 'vimeo'; id: string; embedUrl: string; watchUrl: string }
  | { kind: 'file'; src: string }

function youtubeId(input: string): string | null {
  try {
    const url = new URL(input)
    const host = url.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0]
      return id || null
    }
    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtube-nocookie.com'
    ) {
      if (url.pathname.startsWith('/embed/')) {
        return url.pathname.split('/')[2] || null
      }
      if (url.pathname.startsWith('/shorts/')) {
        return url.pathname.split('/')[2] || null
      }
      return url.searchParams.get('v')
    }
  } catch {
    /* fall through */
  }
  return null
}

function vimeoId(input: string): string | null {
  try {
    const url = new URL(input)
    const host = url.hostname.replace(/^www\./, '')
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const parts = url.pathname.split('/').filter(Boolean)
      const id = parts.find((p) => /^\d+$/.test(p))
      return id || null
    }
  } catch {
    /* fall through */
  }
  return null
}

export function resolveVideoPlayback(
  source?: string | null,
): VideoPlayback | null {
  const raw = source?.trim()
  if (!raw) return null

  const yt = youtubeId(raw)
  if (yt) {
    return {
      kind: 'youtube',
      id: yt,
      embedUrl: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&modestbranding=1&playsinline=1`,
      watchUrl: `https://www.youtube.com/watch?v=${yt}`,
    }
  }

  const vim = vimeoId(raw)
  if (vim) {
    return {
      kind: 'vimeo',
      id: vim,
      embedUrl: `https://player.vimeo.com/video/${vim}?autoplay=1&title=0&byline=0&portrait=0`,
      watchUrl: `https://vimeo.com/${vim}`,
    }
  }

  return { kind: 'file', src: raw }
}

/** Public thumbnail for embeddable links (no CORS needed for <img>). */
export function getRemotePosterUrl(source?: string | null): string | null {
  const playback = resolveVideoPlayback(source)
  if (!playback) return null
  if (playback.kind === 'youtube') {
    return `https://i.ytimg.com/vi/${playback.id}/hqdefault.jpg`
  }
  if (playback.kind === 'vimeo') {
    return `https://vumbnail.com/${playback.id}.jpg`
  }
  return null
}

function loadVideoElement(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    // Needed so canvas capture works for cross-origin assets (MinIO) when CORS allows it.
    video.crossOrigin = 'anonymous'
    video.onloadeddata = () => resolve(video)
    video.onerror = () => reject(new Error('Failed to load video for poster'))
    video.src = src
  })
}

/**
 * Capture a still frame from a local File or CORS-enabled video URL.
 * Seeks near 1s (or 10% of duration) for a representative frame.
 */
export async function captureVideoPosterBlob(
  source: File | string,
  atSeconds = 1,
): Promise<{ blob: Blob; durationSec: number }> {
  const objectUrl =
    typeof source === 'string' ? source : URL.createObjectURL(source)
  const shouldRevoke = typeof source !== 'string'

  try {
    const video = await loadVideoElement(objectUrl)
    await new Promise<void>((resolve, reject) => {
      const target = Math.min(
        Math.max(0.1, atSeconds),
        Math.max(0.1, (video.duration || 2) * 0.1),
      )
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked)
        resolve()
      }
      video.addEventListener('seeked', onSeeked)
      try {
        video.currentTime = Number.isFinite(video.duration)
          ? Math.min(target, Math.max(0.05, video.duration - 0.05))
          : target
      } catch (error) {
        video.removeEventListener('seeked', onSeeked)
        reject(error)
      }
    })

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) =>
          result ? resolve(result) : reject(new Error('Poster encode failed')),
        'image/jpeg',
        0.9,
      )
    })

    return {
      blob,
      durationSec: Number.isFinite(video.duration) ? video.duration : 0,
    }
  } finally {
    if (shouldRevoke) URL.revokeObjectURL(objectUrl)
  }
}

export function formatWatchDuration(seconds: number): string {
  if (!seconds || seconds < 1) return ''
  const mins = Math.max(1, Math.round(seconds / 60))
  return `${mins} min`
}
