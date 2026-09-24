import { useSearchParams } from 'react-router-dom'

export type ListingFilterKey = 'location' | 'topic' | 'series' | 'category' | 'q'

export function listingPageFromSearch(searchParams: URLSearchParams) {
  const raw = Number(searchParams.get('page') || '1')
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1
}

export function patchListingPage(current: URLSearchParams, page: number) {
  const next = new URLSearchParams(current)
  if (page <= 1) next.delete('page')
  else next.set('page', String(page))
  return next
}

export function patchListingParams(
  current: URLSearchParams,
  patch: Partial<Record<ListingFilterKey, string>>,
) {
  const next = new URLSearchParams(current)
  next.delete('view')
  next.delete('page')
  for (const key of ['location', 'topic', 'series', 'category', 'q'] as const) {
    if (!(key in patch)) continue
    const value = patch[key]?.trim() ?? ''
    if (value) next.set(key, value)
    else next.delete(key)
  }
  return next
}

export function useListingFilters() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = searchParams.get('location') || ''
  const topic = searchParams.get('topic') || ''
  const series = searchParams.get('series') || ''
  const category = searchParams.get('category') || ''
  const q = searchParams.get('q') || ''
  const page = listingPageFromSearch(searchParams)

  const setFilters = (patch: Partial<Record<ListingFilterKey, string>>) => {
    setSearchParams(patchListingParams(searchParams, patch), { replace: false })
  }

  const setPage = (nextPage: number) => {
    const safe = Number.isFinite(nextPage) && nextPage > 0 ? Math.floor(nextPage) : 1
    setSearchParams(patchListingPage(searchParams, safe), { replace: false })
  }

  return {
    location,
    topic,
    series,
    category,
    q,
    page,
    searchParams,
    setFilters,
    setPage,
  }
}
