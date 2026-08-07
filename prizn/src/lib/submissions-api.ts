import { api } from '@/lib/api'

export type SubmissionStatus =
  | 'new'
  | 'review'
  | 'changes'
  | 'approved'
  | 'rejected'

export type SubmissionAttachment = {
  url: string
  name: string
  mimeType: string
  size: number
  key?: string
}

export type CmsSubmission = {
  id: string
  name: string
  email: string
  phone: string | null
  place: string
  village: string
  title: string
  category: string
  description: string
  story: string
  links: string | null
  ownWork: boolean
  status: SubmissionStatus
  notes: string | null
  articleId: string | null
  photoUrls: SubmissionAttachment[]
  documentUrls: SubmissionAttachment[]
  image: string
  submittedAt: string
  createdAt: string
  updatedAt: string
}

export type CreateSubmissionInput = {
  name: string
  email: string
  phone?: string
  place: string
  title: string
  category: string
  description: string
  story: string
  links?: string
  ownWork: boolean
  photos?: File[]
  documents?: File[]
}

function statusToApi(status: SubmissionStatus): string {
  return status.toUpperCase()
}

export type CmsSubmissionsPage = {
  items: CmsSubmission[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function createPublicSubmission(input: CreateSubmissionInput) {
  const form = new FormData()
  form.append('name', input.name)
  form.append('email', input.email)
  if (input.phone) form.append('phone', input.phone)
  form.append('place', input.place)
  form.append('title', input.title)
  form.append('category', input.category)
  form.append('description', input.description)
  form.append('story', input.story)
  if (input.links) form.append('links', input.links)
  form.append('ownWork', input.ownWork ? 'true' : 'false')

  for (const file of input.photos ?? []) {
    form.append('photos', file)
  }
  for (const file of input.documents ?? []) {
    form.append('documents', file)
  }

  return api.uploadForm<CmsSubmission>('/submissions', form)
}

export function listCmsSubmissions(params?: {
  page?: number
  pageSize?: number
  q?: string
  status?: SubmissionStatus
}) {
  const search = new URLSearchParams()
  if (params?.page != null) search.set('page', String(params.page))
  if (params?.pageSize != null) search.set('pageSize', String(params.pageSize))
  if (params?.q) search.set('q', params.q)
  if (params?.status) search.set('status', statusToApi(params.status))
  const qs = search.toString()
  return api.get<CmsSubmissionsPage>(`/cms/submissions${qs ? `?${qs}` : ''}`)
}

export function getCmsSubmission(id: string) {
  return api.get<CmsSubmission>(`/cms/submissions/${id}`)
}

export function updateCmsSubmission(
  id: string,
  body: { status?: SubmissionStatus; notes?: string },
) {
  return api.patch<CmsSubmission>(`/cms/submissions/${id}`, {
    status: body.status ? statusToApi(body.status) : undefined,
    notes: body.notes,
  })
}

export function convertCmsSubmission(id: string) {
  return api.post<{ submission: CmsSubmission; articleId: string }>(
    `/cms/submissions/${id}/convert`,
  )
}

export function deleteCmsSubmission(id: string) {
  return api.delete<{ ok: boolean }>(`/cms/submissions/${id}`)
}
