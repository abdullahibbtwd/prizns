import { describe, expect, it } from 'vitest'
import { articlePath, preferApi } from './public-content'

describe('preferApi', () => {
  it('returns API rows including empty arrays', () => {
    expect(preferApi([1, 2])).toEqual([1, 2])
    expect(preferApi([])).toEqual([])
  })

  it('treats undefined as an empty list', () => {
    expect(preferApi(undefined)).toEqual([])
  })
})

describe('articlePath', () => {
  it('prefers the stored path', () => {
    expect(
      articlePath({ path: '/places/belogradchik', slug: 'x', section: 'places' }),
    ).toBe('/places/belogradchik')
  })

  it('maps story sections onto /stories', () => {
    expect(
      articlePath({ path: '', slug: 'maria', section: 'human-stories' }),
    ).toBe('/stories/maria')
    expect(
      articlePath({ path: '', slug: 'feat', section: 'featured' }),
    ).toBe('/stories/feat')
    expect(
      articlePath({ path: '', slug: 'old', section: 'human_stories' }),
    ).toBe('/stories/old')
  })

  it('uses the section slug for other sections', () => {
    expect(
      articlePath({ path: '', slug: 'kukeri', section: 'traditions' }),
    ).toBe('/traditions/kukeri')
  })
})
