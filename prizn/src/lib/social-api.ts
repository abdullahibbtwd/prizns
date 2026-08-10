import { api } from '@/lib/api'

export type SocialPlatform = string
export type SocialPostStatus =
  | 'DRAFT'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'FAILED'

export type SocialPlatformCatalogItem = {
  code: string
  labelEn: string
  labelBg: string
  hintEn: string
  hintBg: string
  defaultSelected: boolean
}

export type SocialPlatformSettings = {
  platforms: string[]
  catalog: SocialPlatformCatalogItem[]
}

export type SocialPost = {
  id: string
  articleId: string
  platform: SocialPlatform
  status: SocialPostStatus
  body: string
  hashtags: string
  promptVersion?: string | null
  scheduledAt?: string | null
  publishedAt?: string | null
  externalId?: string | null
  error?: string | null
  createdAt: string
  updatedAt: string
  article?: {
    id: string
    titleBg: string
    title: string
    path: string
    section: string
    status: string
    slug: string
  }
}

export function listCmsSocialPosts(params?: {
  status?: string
  articleId?: string
}) {
  const search = new URLSearchParams()
  if (params?.status) search.set('status', params.status)
  if (params?.articleId) search.set('articleId', params.articleId)
  const qs = search.toString()
  return api.get<SocialPost[]>(`/cms/social${qs ? `?${qs}` : ''}`)
}

export function getCmsSocialPlatforms() {
  return api.get<SocialPlatformSettings>('/cms/social/platforms')
}

export function saveCmsSocialPlatforms(platforms: string[]) {
  return api.put<SocialPlatformSettings>('/cms/social/platforms', {
    platforms,
  })
}

export function generateCmsSocial(articleId: string) {
  return api.post<SocialPost[]>('/cms/social/generate', { articleId })
}

export function updateCmsSocialPost(
  id: string,
  body: { body?: string; hashtags?: string; status?: 'DRAFT' | 'APPROVED' },
) {
  return api.patch<SocialPost>(`/cms/social/${id}`, body)
}

export function approveCmsSocialPost(id: string) {
  return api.post<SocialPost>(`/cms/social/${id}/approve`, {})
}

export function deleteCmsSocialPost(id: string) {
  return api.delete<{ ok: boolean; id: string }>(`/cms/social/${id}`)
}
