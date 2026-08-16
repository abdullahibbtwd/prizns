import { describe, expect, it } from 'vitest'
import {
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
      '/traditions',
    ])
    expect(getPrimaryNavLinks('en')[0]?.label).toBe('Human Stories')
  })

  it('returns footer and tertiary sections', () => {
    expect(getFooterSecondaryLinks('en').some((l) => l.to === '/shop')).toBe(true)
    expect(getFooterSecondaryLinks('en').some((l) => l.to === '/archive')).toBe(
      true,
    )
    expect(getTertiaryNavLinks('bg').some((l) => l.to === '/authors')).toBe(true)
  })

  it('combines legacy journal nav links', () => {
    const links = getJournalNavLinks('en')
    expect(links.some((l) => l.to === '/video')).toBe(true)
    expect(links.some((l) => l.to === '/campaigns')).toBe(true)
  })
})
