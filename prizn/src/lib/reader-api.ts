import { api } from '@/lib/api'

export type Reader = {
  id: string
  email: string
  name: string | null
  locale: string | null
}

export type MagicLinkIntent = {
  type: 'save'
  articleId: string
}

export type SavedArticleRow = {
  id: string
  savedAt: string
  article: {
    id: string
    section: string
    slug: string
    path: string
    titleBg: string
    titleEn: string | null
    subtitleBg: string
    subtitleEn: string | null
    categoryBg: string
    categoryEn: string | null
    locationBg: string
    locationEn: string | null
    publishedAt: string | null
    heroUrl: string | null
  }
}

export function requestMagicLink(body: {
  email: string
  locale?: string
  returnUrl?: string
  intent?: MagicLinkIntent
}) {
  return api.post<
    | { ok: true; authenticated: false }
    | {
        ok: true
        authenticated: true
        reader: Reader
        intent: MagicLinkIntent | null
        returnUrl: string | null
      }
  >('/reader-auth/request', body)
}

export function verifyMagicLink(token: string) {
  return api.post<{
    reader: Reader
    intent: MagicLinkIntent | null
    returnUrl: string | null
  }>('/reader-auth/verify', { token })
}

export function refreshReaderSession() {
  return api.post<{ reader: Reader }>('/reader-auth/refresh')
}

export function logoutReader() {
  return api.post<{ ok: true }>('/reader-auth/logout')
}

export function getReaderMe() {
  return api.get<{ reader: Reader }>('/reader/me')
}

export function listSavedArticles() {
  return api.get<SavedArticleRow[]>('/reader/saves')
}

export function getSaveStatus(articleId: string) {
  return api.get<{ saved: boolean }>(
    `/reader/saves/status?articleId=${encodeURIComponent(articleId)}`,
  )
}

export function saveArticle(articleId: string) {
  return api.post<{ ok: true; saved: true; id: string }>('/reader/saves', {
    articleId,
  })
}

export function unsaveArticle(articleId: string) {
  return api.delete<{ ok: true; saved: false }>(
    `/reader/saves/${encodeURIComponent(articleId)}`,
  )
}
