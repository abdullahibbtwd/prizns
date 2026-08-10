import { api } from '@/lib/api'

export type PartnershipStatus = 'NEW' | 'REVIEW' | 'CONTACTED' | 'CLOSED'

export type CmsPartnership = {
  id: string
  organization: string
  contactName: string
  email: string
  phone: string | null
  website: string | null
  type: string
  budget: string | null
  message: string
  status: PartnershipStatus
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type CreatePartnershipInput = {
  organization: string
  contactName: string
  email: string
  phone?: string
  website?: string
  type: string
  budget?: string
  message: string
  honeypot?: string
}

export type CmsPartnershipsPage = {
  items: CmsPartnership[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function createPublicPartnership(body: CreatePartnershipInput) {
  return api.post<CmsPartnership | { ok: true }>('/partnerships', body)
}

export function listCmsPartnerships(params?: {
  page?: number
  pageSize?: number
  q?: string
  status?: PartnershipStatus
}) {
  const search = new URLSearchParams()
  if (params?.page != null) search.set('page', String(params.page))
  if (params?.pageSize != null) search.set('pageSize', String(params.pageSize))
  if (params?.q) search.set('q', params.q)
  if (params?.status) search.set('status', params.status)
  const qs = search.toString()
  return api.get<CmsPartnershipsPage>(
    `/cms/partnerships${qs ? `?${qs}` : ''}`,
  )
}

export function getCmsPartnership(id: string) {
  return api.get<CmsPartnership>(`/cms/partnerships/${id}`)
}

export function updateCmsPartnership(
  id: string,
  body: { status?: PartnershipStatus; notes?: string },
) {
  return api.patch<CmsPartnership>(`/cms/partnerships/${id}`, body)
}
