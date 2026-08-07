import { api } from '@/lib/api'

export type CmsUserRole = 'ADMIN' | 'EDITOR'

export type CmsUser = {
  id: string
  email: string
  name: string | null
  role: CmsUserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
  joinedAt: string
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
  body: { role?: CmsUserRole; isActive?: boolean; name?: string },
) {
  return api.patch<CmsUser>(`/cms/users/${id}`, body)
}
