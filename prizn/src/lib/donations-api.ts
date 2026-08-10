import { api } from '@/lib/api'

export type DonationStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

export type CmsDonation = {
  id: string
  amountCents: number
  amountBgn: number
  currency: string
  status: DonationStatus
  email: string | null
  name: string | null
  stripeSessionId: string | null
  stripePaymentIntentId: string | null
  createdAt: string
  updatedAt: string
}

export type CmsDonationsPage = {
  items: CmsDonation[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function createDonationCheckout(body: {
  amountBgn: number
  email?: string
  name?: string
}) {
  return api.post<{ url: string }>('/donations/checkout', body)
}

export function listCmsDonations(params?: {
  page?: number
  pageSize?: number
  status?: DonationStatus
}) {
  const search = new URLSearchParams()
  if (params?.page != null) search.set('page', String(params.page))
  if (params?.pageSize != null) search.set('pageSize', String(params.pageSize))
  if (params?.status) search.set('status', params.status)
  const qs = search.toString()
  return api.get<CmsDonationsPage>(`/cms/donations${qs ? `?${qs}` : ''}`)
}
