import { describe, expect, it, vi } from 'vitest'
import { contactCategoryLabel } from './contact-labels'

describe('contactCategoryLabel', () => {
  it('maps each category to an i18n key', () => {
    const t = vi.fn((key: string) => key)
    expect(contactCategoryLabel('BUSINESS', t)).toBe(
      'cms.contactDesk.catBusiness',
    )
    expect(contactCategoryLabel('SPAM', t)).toBe('cms.contactDesk.catSpam')
    expect(contactCategoryLabel('UNKNOWN', t)).toBe(
      'cms.contactDesk.catUnknown',
    )
  })
})
