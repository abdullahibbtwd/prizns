import { api } from '@/lib/api'

export type DigestEpisode = {
  seriesId: string
  seriesTitleBg: string
  seriesTitle: string
  seriesSlug: string
  articleId: string
  titleBg: string
  title: string
  subtitleBg: string
  path: string
  slug: string
  episodeNumber: number
}

export type DigestPreview = {
  next: DigestEpisode | null
  subscriberCount: number
  mailConfigured?: boolean
}

export type DigestHistoryItem = {
  id: string
  status: 'SENT' | 'FAILED'
  subject: string
  recipientCount: number
  resendId?: string | null
  error?: string | null
  sentAt: string
  series: {
    id: string
    titleBg: string
    title: string
    slug: string
  }
  article: {
    id: string
    titleBg: string
    title: string
    path: string
    slug: string
  }
}

export function getCmsDigestPreview(seriesId?: string) {
  const qs = seriesId ? `?seriesId=${encodeURIComponent(seriesId)}` : ''
  return api.get<DigestPreview>(`/cms/digest/preview${qs}`)
}

export function listCmsDigestHistory() {
  return api.get<DigestHistoryItem[]>('/cms/digest/history')
}

export function sendCmsDigest(body?: { seriesId?: string; articleId?: string }) {
  return api.post<{
    ok: boolean
    id: string
    recipientCount: number
    episode: DigestEpisode
  }>('/cms/digest/send', body ?? {})
}
