import { api } from '@/lib/api'

export type CmsSearchStory = {
  id: string
  titleBg: string
  titleEn: string | null
  status: string
  categoryBg: string
  authorBg: string | null
  authorEn: string | null
}

export type CmsSearchAuthor = {
  id: string
  nameBg: string
  nameEn: string | null
  roleBg: string
  roleEn: string | null
  locationBg: string
  stories: number
}

export type CmsSearchSubmission = {
  id: string
  title: string
  name: string
  place: string
  status: string
}

export type CmsSearchTag = {
  id: string
  kind: string
  nameBg: string
  nameEn: string | null
  slug: string
}

export type CmsSearchResult = {
  q: string
  stories: CmsSearchStory[]
  authors: CmsSearchAuthor[]
  submissions: CmsSearchSubmission[]
  tags: CmsSearchTag[]
}

export function cmsGlobalSearch(q: string) {
  const search = new URLSearchParams({ q })
  return api.get<CmsSearchResult>(`/cms/dashboard/search?${search}`)
}
