import { describe, expect, it } from 'vitest'
import {
  getContributeNavLinks,
  getFooterSecondaryLinks,
  getJournalNavLinks,
  getPrimaryNavLinks,
  getTertiaryNavLinks,
} from './nav'

describe('journal nav links', () => {
  it('returns localized primary links', () => {
    expect(getPrimaryNavLinks('bg').map((l) => l.to)).toEqual([
      '/stories',
      '/places',
      '/events',
      '/traditions',
    ])
    expect(getPrimaryNavLinks('en')[0]?.label).toBe('Human Stories')
    expect(getPrimaryNavLinks('en').some((l) => l.to === '/events')).toBe(true)
  })

  it('keeps shop and authors after the pillars, without sports or news', () => {
    const secondary = getFooterSecondaryLinks('en')
    expect(secondary.map((l) => l.to)).toEqual(['/shop', '/authors'])
    expect(secondary.some((l) => l.to === '/sports')).toBe(false)
    expect(secondary.some((l) => l.to === '/news')).toBe(false)
    expect(getContributeNavLinks('en').map((l) => l.to)).toEqual([
      '/write-for-us',
      '/support',
      '/partnerships',
    ])
    expect(getTertiaryNavLinks('bg').some((l) => l.to === '/write-for-us')).toBe(
      true,
    )
  })

  it('combines legacy journal nav links', () => {
    const links = getJournalNavLinks('en')
    expect(links.some((l) => l.to === '/video')).toBe(true)
    expect(links.some((l) => l.to === '/campaigns')).toBe(true)
  })
})
