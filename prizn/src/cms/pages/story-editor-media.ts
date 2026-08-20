import {
  getRemotePosterUrl,
  resolveVideoPlayback,
} from '@/lib/video-playback'

export type StoryMediaKind = 'image' | 'video'

export type StoryMediaItem = {
  id: string
  url: string
  kind: StoryMediaKind
  /** Local file waiting to upload on Save/Publish */
  file?: File
  posterUrl?: string
}

export function isEmbedVideoItem(item: Pick<StoryMediaItem, 'id' | 'kind' | 'url' | 'file'>): boolean {
  if (item.kind !== 'video' || item.file) return false
  if (item.id.startsWith('embed-')) return true
  const playback = resolveVideoPlayback(item.url)
  return playback?.kind === 'youtube' || playback?.kind === 'vimeo'
}

export function embedVideoMediaId(url: string): string {
  const playback = resolveVideoPlayback(url)
  if (playback?.kind === 'youtube' || playback?.kind === 'vimeo') {
    return `embed-${playback.kind}-${playback.id}`
  }
  return `embed-video`
}

export function mediaThumbUrl(item: StoryMediaItem): string {
  if (item.kind !== 'video') return item.url
  return item.posterUrl || getRemotePosterUrl(item.url) || item.url
}

export function mergeLoadedMedia(article: {
  gallery?: Array<{ id: string; url: string; kind?: string | null }>
  heroMediaId?: string | null
  image?: string
  videoUrl?: string | null
  videoMediaId?: string | null
}): StoryMediaItem[] {
  const items: StoryMediaItem[] = (article.gallery ?? []).map((item) => {
    const video = item.kind === 'VIDEO' || item.kind === 'video'
    return {
      id: item.id,
      url: item.url,
      kind: video ? 'video' : 'image',
      posterUrl: video ? getRemotePosterUrl(item.url) || undefined : undefined,
    }
  })

  if (items.length === 0 && article.heroMediaId && article.image) {
    items.push({
      id: article.heroMediaId,
      url: article.image,
      kind: 'image',
    })
  }

  const videoUrl = article.videoUrl?.trim() || ''
  const already = items.some(
    (item) =>
      item.id === article.videoMediaId ||
      item.url === videoUrl ||
      (videoUrl && item.id === embedVideoMediaId(videoUrl)),
  )
  if (!videoUrl || already) return items

  const playback = resolveVideoPlayback(videoUrl)
  const embed =
    playback?.kind === 'youtube' || playback?.kind === 'vimeo'
  const videoItem: StoryMediaItem = {
    id:
      article.videoMediaId && !embed
        ? article.videoMediaId
        : embed
          ? embedVideoMediaId(videoUrl)
          : article.videoMediaId || 'embed-video',
    kind: 'video',
    url: videoUrl,
    posterUrl: getRemotePosterUrl(videoUrl) || undefined,
  }

  if (!article.heroMediaId) items.unshift(videoItem)
  else items.push(videoItem)
  return items
}

export function mergeBodyVideosIntoGallery(
  items: StoryMediaItem[],
  body?: Array<{ type: string; mediaId?: string; url?: string }>,
): StoryMediaItem[] {
  const next = [...items]
  for (const block of body ?? []) {
    if (block.type !== 'video') continue
    const url = block.url?.trim() || ''
    const id = block.mediaId || (url ? embedVideoMediaId(url) : '')
    if (!id && !url) continue
    if (next.some((item) => item.id === id || (url && item.url === url))) {
      continue
    }
    next.push({
      id: id || embedVideoMediaId(url),
      kind: 'video',
      url,
      posterUrl: getRemotePosterUrl(url) || undefined,
    })
  }
  return next
}

export function mediaSaveFields(
  gallery: StoryMediaItem[],
  idMap: Map<string, string>,
): {
  galleryMediaIds: string[]
  heroMediaId: string | null
  videoUrl: string | null
  videoMediaId: string | null
} {
  const resolved = gallery.map((item) => {
    const mapped = idMap.get(item.id)
    const savedId =
      mapped ||
      (item.id.startsWith('local-') || item.id.startsWith('embed-')
        ? undefined
        : item.id)
    return { ...item, savedId }
  })

  const galleryMediaIds = resolved
    .filter((item) => item.savedId)
    .map((item) => item.savedId as string)

  const first = resolved[0]
  const heroMediaId =
    !first || isEmbedVideoItem(first) ? null : first.savedId || null

  const firstVideo = resolved.find((item) => item.kind === 'video')
  let videoUrl: string | null = null
  let videoMediaId: string | null = null
  if (firstVideo) {
    if (isEmbedVideoItem(firstVideo) || !firstVideo.savedId) {
      videoUrl = firstVideo.url.startsWith('blob:') ? null : firstVideo.url
      videoMediaId = null
    } else {
      videoMediaId = firstVideo.savedId
      videoUrl = null
    }
  }

  return { galleryMediaIds, heroMediaId, videoUrl, videoMediaId }
}
