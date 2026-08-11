import { api } from '@/lib/api'

export type ContactStatus = 'NEW' | 'REVIEW' | 'REPLIED' | 'CLOSED'

export type ContactCategory =
  | 'BUSINESS'
  | 'STORY_TIP'
  | 'SPAM'
  | 'GENERAL'
  | 'UNKNOWN'

export type CmsContactInquiry = {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: ContactStatus
  notes: string | null
  aiCategory: ContactCategory | null
  aiSummary: string | null
  classifiedAt: string | null
  autoRepliedAt: string | null
  createdAt: string
  updatedAt: string
}

export type CreateContactInput = {
  name: string
  email: string
  subject: string
  message: string
  honeypot?: string
}

export type CmsContactPage = {
  items: CmsContactInquiry[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function createPublicContact(body: CreateContactInput) {
  return api.post<CmsContactInquiry | { ok: true }>('/contact', body)
}

export function listCmsContact(params?: {
  page?: number
  pageSize?: number
  q?: string
  status?: ContactStatus
  category?: ContactCategory
}) {
  const search = new URLSearchParams()
  if (params?.page != null) search.set('page', String(params.page))
  if (params?.pageSize != null) search.set('pageSize', String(params.pageSize))
  if (params?.q) search.set('q', params.q)
  if (params?.status) search.set('status', params.status)
  if (params?.category) search.set('category', params.category)
  const qs = search.toString()
  return api.get<CmsContactPage>(`/cms/contact${qs ? `?${qs}` : ''}`)
}

export function getCmsContact(id: string) {
  return api.get<CmsContactInquiry>(`/cms/contact/${encodeURIComponent(id)}`)
}

export function updateCmsContact(
  id: string,
  body: { status?: ContactStatus; notes?: string },
) {
  return api.patch<CmsContactInquiry>(`/cms/contact/${id}`, body)
}
