import { useSearchParams } from 'react-router-dom'

export type ListingFilterKey = 'location' | 'topic' | 'series'

export function patchListingParams(
  current: URLSearchParams,
  patch: Partial<Record<ListingFilterKey, string>>,
) {
  const next = new URLSearchParams(current)
  next.delete('view')
  for (const key of ['location', 'topic', 'series'] as const) {
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

  const setFilters = (patch: Partial<Record<ListingFilterKey, string>>) => {
    setSearchParams(patchListingParams(searchParams, patch), { replace: false })
  }

  return { location, topic, series, searchParams, setFilters }
}
