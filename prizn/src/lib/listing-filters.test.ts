import { describe, expect, it } from 'vitest'
import {
  listingPageFromSearch,
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
})
