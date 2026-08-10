import { api } from '@/lib/api'

export type TagKind = 'LOCATION' | 'TOPIC' | 'CATEGORY'

export type CmsTag = {
  id: string
  slug: string
  kind: TagKind
  nameBg: string
  nameEn: string | null
  name: string
  createdAt: string
  updatedAt: string
}

export function listPublicTags(kind?: TagKind) {
  const qs = kind ? `?kind=${encodeURIComponent(kind)}` : ''
  return api.get<CmsTag[]>(`/tags${qs}`)
}

export function listCmsTags(kind?: TagKind) {
  const qs = kind ? `?kind=${encodeURIComponent(kind)}` : ''
  return api.get<CmsTag[]>(`/cms/tags${qs}`)
}

export function createCmsTag(body: {
  kind: TagKind
  nameBg: string
}) {
  return api.post<CmsTag>('/cms/tags', body)
}

export function updateCmsTag(
  id: string,
  body: Partial<{ kind: TagKind; nameBg: string }>,
) {
  return api.patch<CmsTag>(`/cms/tags/${id}`, body)
}

export function deleteCmsTag(id: string) {
  return api.delete<{ ok: boolean; id: string }>(`/cms/tags/${id}`)
}
