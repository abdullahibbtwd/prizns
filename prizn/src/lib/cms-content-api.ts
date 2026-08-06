import { api } from '@/lib/api'
import type {
  AuthorFormValues,
  CmsAuthor,
  CmsAuthorOption,
  CmsSeries,
  SeriesFormValues,
} from '@/lib/cms-types'

export function listCmsAuthors(all: true): Promise<CmsAuthor[]>
export function listCmsAuthors(all?: false): Promise<CmsAuthorOption[]>
export function listCmsAuthors(all = false) {
  const qs = all ? '?all=1' : ''
  if (all) return api.get<CmsAuthor[]>(`/cms/authors${qs}`)
  return api.get<CmsAuthorOption[]>(`/cms/authors${qs}`)
}

export function getCmsAuthor(id: string) {
  return api.get<CmsAuthor>(`/cms/authors/${id}`)
}

export function createCmsAuthor(
  body: Partial<AuthorFormValues> & { nameBg: string },
) {
  return api.post<CmsAuthor>('/cms/authors', {
    ...body,
    aliases:
      typeof body.aliases === 'string'
        ? body.aliases
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : body.aliases,
  })
}

export function updateCmsAuthor(id: string, body: Partial<AuthorFormValues>) {
  return api.patch<CmsAuthor>(`/cms/authors/${id}`, {
    ...body,
    aliases:
      typeof body.aliases === 'string'
        ? body.aliases
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : body.aliases,
  })
}

/** Quick create used by story editor (name only). */
export function createCmsAuthorQuick(nameBg: string) {
  return api.post<CmsAuthorOption>('/cms/authors', { nameBg })
}

export function listCmsSeries() {
  return api.get<CmsSeries[]>('/cms/series')
}

export function getCmsSeries(id: string) {
  return api.get<CmsSeries>(`/cms/series/${id}`)
}

export function createCmsSeries(
  body: Partial<SeriesFormValues> & { titleBg: string },
) {
  return api.post<CmsSeries>('/cms/series', {
    ...body,
    coverMediaId: body.coverMediaId || undefined,
  })
}

export function updateCmsSeries(id: string, body: Partial<SeriesFormValues>) {
  return api.patch<CmsSeries>(`/cms/series/${id}`, {
    ...body,
    coverMediaId: body.coverMediaId || null,
  })
}

export function setCmsSeriesEpisodes(id: string, articleIds: string[]) {
  return api.put<CmsSeries>(`/cms/series/${id}/episodes`, { articleIds })
}
