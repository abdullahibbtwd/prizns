import { api } from '@/lib/api'

export type AiSuggestionResult = {
  promptVersion: string
  headlines: string[]
  subtitle: string | null
  seoTitle: string | null
  seoDescription: string | null
  topicTags: string[]
  episodeOutline: string[]
  summary: string | null
}

export type RegionalContextResult = {
  promptVersion: string
  lang: 'bg' | 'en'
  context: string
  placeNotes: string[]
  whyItMatters: string | null
}

export function suggestCmsAi(body: {
  articleId?: string
  titleBg: string
  subtitleBg?: string
  section?: string
  bodyText?: string
  locationBg?: string
  categoryBg?: string
  lang?: 'bg' | 'en'
}) {
  return api.post<AiSuggestionResult>('/cms/ai/suggest', body)
}

export function fetchRegionalContext(body: {
  section: string
  slug: string
  lang?: 'bg' | 'en'
}) {
  return api.post<RegionalContextResult>('/ai/regional-context', body)
}

export type ArchiveAskResult = {
  refused: boolean
  answer: string | null
  lang: 'bg' | 'en'
  citations: Array<{
    path: string
    title: string
    titleBg: string
    score: number
  }>
}

export function askArchive(body: { question: string; lang?: 'bg' | 'en' }) {
  return api.post<ArchiveAskResult>('/archive/ask', body)
}
