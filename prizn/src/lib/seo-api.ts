import { api } from '@/lib/api'

export type SeoCoverageGap = {
  id: string
  path: string
  section: string
  titleBg: string
  titleEn: string | null
  hasTitle: boolean
  hasDescription: boolean
}

export type SeoOverview = {
  siteUrl: string
  sitemapUrl: string
  robotsUrl: string
  feedUrl: string
  published: number
  withUniqueMeta: number
  missingTitle: number
  missingDescription: number
  coveragePct: number
  evergreen: {
    traditions: number
    places: number
  }
  gaps: SeoCoverageGap[]
}

export function getCmsSeoOverview() {
  return api.get<SeoOverview>('/cms/seo/overview')
}
