import { api } from '@/lib/api'

export type NewsletterSubscriber = {
  id: string
  email: string
  source: string | null
  createdAt: string
  updatedAt: string
  subscribedAt: string
}

export type NewsletterSubscribersPage = {
  items: NewsletterSubscriber[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function subscribeNewsletter(email: string, source = 'website') {
  return api.post<NewsletterSubscriber>('/newsletter/subscribe', {
    email: email.trim().toLowerCase(),
    source,
  })
}

export function listCmsNewsletterSubscribers(params?: {
  page?: number
  pageSize?: number
  q?: string
}) {
  const search = new URLSearchParams()
  if (params?.page != null) search.set('page', String(params.page))
  if (params?.pageSize != null) search.set('pageSize', String(params.pageSize))
  if (params?.q) search.set('q', params.q)
  const qs = search.toString()
  return api.get<NewsletterSubscribersPage>(
    `/cms/newsletter/subscribers${qs ? `?${qs}` : ''}`,
  )
}

export function deleteCmsNewsletterSubscriber(id: string) {
  return api.delete<{ ok: boolean }>(`/cms/newsletter/subscribers/${id}`)
}
