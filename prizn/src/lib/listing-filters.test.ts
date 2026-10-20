import { describe, expect, it } from 'vitest'
import {
  listingPageFromSearch,
  parseListingDate,
  parseListingSort,
  patchListingPage,
  patchListingParams,
} from './listing-filters'

describe('listing filters', () => {
  it('reads a valid page from the query string', () => {
    expect(listingPageFromSearch(new URLSearchParams('page=3'))).toBe(3)
    expect(listingPageFromSearch(new URLSearchParams(''))).toBe(1)
    expect(listingPageFromSearch(new URLSearchParams('page=-2'))).toBe(1)
  })

  it('omits page=1 from the URL and sets later pages', () => {
    const withPage = patchListingPage(new URLSearchParams('location=vidin'), 2)
    expect(withPage.get('page')).toBe('2')
    expect(withPage.get('location')).toBe('vidin')

    const firstPage = patchListingPage(withPage, 1)
    expect(firstPage.get('page')).toBeNull()
    expect(firstPage.get('location')).toBe('vidin')
  })

  it('resets page when a filter changes', () => {
    const current = new URLSearchParams('location=vidin&page=3')
    const next = patchListingParams(current, { location: 'montana' })
    expect(next.get('location')).toBe('montana')
    expect(next.get('page')).toBeNull()
  })

  it('omits default sort from the URL and accepts alphabet sorts', () => {
    expect(parseListingSort(null)).toBe('newest')
    expect(parseListingSort('oldest')).toBe('oldest')
    expect(parseListingSort('az')).toBe('az')
    expect(parseListingSort('za')).toBe('za')
    expect(parseListingSort('title')).toBe('newest')

    const withAz = patchListingParams(
      new URLSearchParams('page=2'),
      { sort: 'az' },
    )
    expect(withAz.get('sort')).toBe('az')
    expect(withAz.get('page')).toBeNull()

    const cleared = patchListingParams(withAz, { sort: 'newest' })
    expect(cleared.get('sort')).toBeNull()
  })

  it('stores valid dateFrom/dateTo and clears invalid dates', () => {
    expect(parseListingDate('2024-03-04')).toBe('2024-03-04')
    expect(parseListingDate('nope')).toBe('')

    const ranged = patchListingParams(new URLSearchParams('page=2'), {
      dateFrom: '2024-01-01',
      dateTo: '2024-12-31',
    })
    expect(ranged.get('dateFrom')).toBe('2024-01-01')
    expect(ranged.get('dateTo')).toBe('2024-12-31')
    expect(ranged.get('page')).toBeNull()

    const cleared = patchListingParams(ranged, { dateFrom: '', dateTo: '' })
    expect(cleared.get('dateFrom')).toBeNull()
    expect(cleared.get('dateTo')).toBeNull()
  })
})
