import { api } from '@/lib/api'
import type { TranslationStatus } from '@/lib/cms-types'

export type CmsCategory = {
  id: string
  slug: string
  nameBg: string
  nameEn: string | null
  name: string
  descriptionBg: string | null
  descriptionEn: string | null
  parentId: string | null
  parentName: string | null
  translationStatus: TranslationStatus
  translationError: string | null
  sourceLang: string | null
  childCount: number
  articleCount: number
  createdAt: string
  updatedAt: string
}

export function listPublicCategories() {
  return api.get<CmsCategory[]>('/categories')
}

export function listCmsCategories() {
  return api.get<CmsCategory[]>('/cms/categories')
}

export function createCmsCategory(body: {
  nameBg: string
  slug?: string
  descriptionBg?: string
  parentId?: string
}) {
  return api.post<CmsCategory>('/cms/categories', body)
}

export function updateCmsCategory(
  id: string,
  body: Partial<{
    nameBg: string
    slug: string
    descriptionBg: string
    parentId: string | null
    nameEn: string
    descriptionEn: string
  }>,
) {
  return api.patch<CmsCategory>(`/cms/categories/${id}`, body)
}

export function deleteCmsCategory(id: string) {
  return api.delete<{ ok: boolean; id: string }>(`/cms/categories/${id}`)
}
