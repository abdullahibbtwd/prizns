import { useSearchParams } from 'react-router-dom'

export type ListingFilterKey =
  | 'location'
  | 'topic'
  | 'series'
  | 'category'
  | 'q'
  | 'sort'
  | 'dateFrom'
  | 'dateTo'

export type PublicListingSort = 'newest' | 'oldest' | 'az' | 'za'

export const DEFAULT_LISTING_SORT: PublicListingSort = 'newest'

export const PUBLIC_LISTING_SORTS: readonly PublicListingSort[] = [
  'newest',
  'oldest',
  'az',
  'za',
]

export function parseListingSort(
  value: string | null | undefined,
): PublicListingSort {
  const v = value?.trim().toLowerCase()
  if (v === 'oldest') return 'oldest'
  if (v === 'az' || v === 'a-z') return 'az'
  if (v === 'za' || v === 'z-a') return 'za'
  return DEFAULT_LISTING_SORT
}

/** Accept YYYY-MM-DD only; ignore garbage. */
export function parseListingDate(
  value: string | null | undefined,
): string {
  const raw = value?.trim() ?? ''
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : ''
}

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
  for (const key of [
    'location',
    'topic',
    'series',
    'category',
    'q',
    'sort',
    'dateFrom',
    'dateTo',
  ] as const) {
    if (!(key in patch)) continue
    const value = patch[key]?.trim() ?? ''
    if (key === 'sort') {
      const sort = parseListingSort(value)
      if (sort === DEFAULT_LISTING_SORT) next.delete('sort')
      else next.set('sort', sort)
      continue
    }
    if (key === 'dateFrom' || key === 'dateTo') {
      const date = parseListingDate(value)
      if (date) next.set(key, date)
      else next.delete(key)
      continue
    }
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
  const sort = parseListingSort(searchParams.get('sort'))
  const dateFrom = parseListingDate(searchParams.get('dateFrom'))
  const dateTo = parseListingDate(searchParams.get('dateTo'))
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
    sort,
    dateFrom,
    dateTo,
    page,
    searchParams,
    setFilters,
    setPage,
  }
}
