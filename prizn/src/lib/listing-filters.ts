import { useSearchParams } from 'react-router-dom'

export type ListingFilterKey = 'location' | 'topic' | 'series' | 'category'

export function patchListingParams(
  current: URLSearchParams,
  patch: Partial<Record<ListingFilterKey, string>>,
) {
  const next = new URLSearchParams(current)
  next.delete('view')
  for (const key of ['location', 'topic', 'series', 'category'] as const) {
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

  const setFilters = (patch: Partial<Record<ListingFilterKey, string>>) => {
    setSearchParams(patchListingParams(searchParams, patch), { replace: false })
  }

  return { location, topic, series, category, searchParams, setFilters }
}
