import { api } from '@/lib/api'

export type TagKind = 'LOCATION' | 'TOPIC' | 'CATEGORY'

export type CmsTag = {
  id: string
  slug: string
  kind: TagKind
  nameBg: string
  nameEn: string | null
  name: string
  lat?: number | null
  lng?: number | null
  geocodeStatus?: 'idle' | 'ok' | 'failed' | 'manual'
  geocodedAt?: string | null
  createdAt: string
  updatedAt: string
}

export type PlacesMapPin = {
  id: string
  slug: string
  nameBg: string
  nameEn: string | null
  name: string
  lat: number
  lng: number
  storyCount: number
}

export function listPublicTags(kind?: TagKind) {
  const qs = kind ? `?kind=${encodeURIComponent(kind)}` : ''
  return api.get<CmsTag[]>(`/tags${qs}`)
}

export function listPlacesMap() {
  return api.get<PlacesMapPin[]>('/places/map')
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
  body: Partial<{ kind: TagKind; nameBg: string; lat: number; lng: number }>,
) {
  return api.patch<CmsTag>(`/cms/tags/${id}`, body)
}

export function geocodeCmsTag(id: string) {
  return api.post<CmsTag>(`/cms/tags/${id}/geocode`)
}

export function deleteCmsTag(id: string) {
  return api.delete<{ ok: boolean; id: string }>(`/cms/tags/${id}`)
}
