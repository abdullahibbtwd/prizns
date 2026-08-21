import { api } from '@/lib/api'
import type { CmsUserRole } from '@/lib/cms-roles'

export type { CmsUserRole }

export type CmsUser = {
  id: string
  email: string
  name: string | null
  role: CmsUserRole
  roles: CmsUserRole[]
  isActive: boolean
  emailVerified: boolean
  createdAt: string
  updatedAt: string
  joinedAt: string
  authorId: string | null
  showOnAuthors: boolean
}

export type CmsUsersPage = {
  items: CmsUser[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function listCmsUsers(params?: {
  page?: number
  pageSize?: number
  q?: string
  role?: CmsUserRole
}) {
  const search = new URLSearchParams()
  if (params?.page != null) search.set('page', String(params.page))
  if (params?.pageSize != null) search.set('pageSize', String(params.pageSize))
  if (params?.q) search.set('q', params.q)
  if (params?.role) search.set('role', params.role)
  const qs = search.toString()
  return api.get<CmsUsersPage>(`/cms/users${qs ? `?${qs}` : ''}`)
}

export function updateCmsUser(
  id: string,
  body: {
    role?: CmsUserRole
    roles?: CmsUserRole[]
    isActive?: boolean
    name?: string
    email?: string
    showOnAuthors?: boolean
  },
) {
  return api.patch<CmsUser>(`/cms/users/${id}`, body)
}

export function createCmsUser(body: {
  name: string
  email: string
  password: string
  role?: CmsUserRole
  roles: CmsUserRole[]
  showOnAuthors?: boolean
}) {
  return api.post<CmsUser>('/cms/users', body)
}

export function deleteCmsUser(id: string) {
  return api.delete<{ ok: boolean; id: string }>(`/cms/users/${id}`)
}

export type CmsProfile = {
  id: string
  email: string
  name: string | null
  role: CmsUserRole
  roles?: CmsUserRole[]
  imageUrl: string | null
  bio: string | null
  websiteUrl: string | null
  facebookUrl: string | null
  instagramUrl: string | null
  youtubeUrl: string | null
  linkedinUrl: string | null
  xUsername: string | null
  authorId: string | null
}

export function getCmsProfile() {
  return api.get<CmsProfile>('/cms/profile')
}

export function updateCmsProfile(body: {
  name?: string
  email?: string
  bio?: string
  websiteUrl?: string
  facebookUrl?: string
  instagramUrl?: string
  youtubeUrl?: string
  linkedinUrl?: string
  xUsername?: string
  imageUrl?: string
  password?: string
}) {
  return api.patch<CmsProfile>('/cms/profile', body)
}

export function logoutOtherCmsSessions() {
  return api.post<{ revoked: number }>('/cms/profile/logout-others')
}
