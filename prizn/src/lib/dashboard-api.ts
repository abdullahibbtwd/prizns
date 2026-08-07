import { api } from '@/lib/api'

export type DashboardChecklist = {
  pendingSubmissions: number
  reviewArticles: number
  failedTranslations: number
  publishedToday: number
  draftArticles: number
  scheduledArticles: number
}

export type EditorialTodo = {
  id: string
  title: string
  done: boolean
  dueAt: string | null
  createdAt: string
  updatedAt: string
}

export function getDashboardChecklist() {
  return api.get<DashboardChecklist>('/cms/dashboard/checklist')
}

export function listCmsTodos() {
  return api.get<EditorialTodo[]>('/cms/todos')
}

export function createCmsTodo(body: { title: string; dueAt?: string | null }) {
  return api.post<EditorialTodo>('/cms/todos', body)
}

export function updateCmsTodo(
  id: string,
  body: { title?: string; done?: boolean; dueAt?: string | null },
) {
  return api.patch<EditorialTodo>(`/cms/todos/${id}`, body)
}

export function deleteCmsTodo(id: string) {
  return api.delete<{ ok: boolean }>(`/cms/todos/${id}`)
}
