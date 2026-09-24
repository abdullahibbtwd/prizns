import { describe, expect, it } from 'vitest'
import {
  formatArticleDate,
  formatCmsListDate,
  formatJournalDate,
  toSofiaDateIso,
} from './format-date'

describe('formatJournalDate', () => {
  it('formats ISO dates in Bulgarian', () => {
    const out = formatJournalDate('2026-08-21', 'bg')
    expect(out.toLowerCase()).toContain('2026')
    expect(out.toLowerCase()).toMatch(/авг/)
  })

  it('formats ISO dates in English', () => {
    expect(formatJournalDate('2026-08-21', 'en')).toMatch(/August 2026/i)
  })

  it('passes through legacy free-text dates', () => {
    expect(formatJournalDate('Лято 2026', 'bg')).toBe('Лято 2026')
  })
})

describe('formatArticleDate', () => {
  it('prefers dateBg for Bulgarian', () => {
    expect(formatArticleDate('bg', '2026-08-21', '2026-08-21')).toMatch(/2026/)
  })
})

describe('toSofiaDateIso', () => {
  it('uses Europe/Sofia calendar date instead of UTC slice', () => {
    // 21:30 UTC on Sept 9 = 00:30 Sofia on Sept 10 (EEST)
    expect(toSofiaDateIso('2026-09-09T21:30:00.000Z')).toBe('2026-09-10')
  })
})

describe('formatCmsListDate', () => {
  it('prefers original dateBg over updatedAt import stamp', () => {
    const out = formatCmsListDate(
      {
        dateBg: '4 март 2020',
        publishedAt: '2020-03-04T10:00:00.000Z',
        updatedAt: '2026-08-28T12:00:00.000Z',
      },
      'bg',
    )
    expect(out).toBe('4 март 2020')
  })
})
