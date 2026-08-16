import { describe, expect, it } from 'vitest'
import {
  getSectionCategoryBg,
  getSectionLabel,
  getSectionPublicLabel,
  sectionLabelsForLang,
} from './section-i18n'

describe('section-i18n', () => {
  it('returns localized CMS labels', () => {
    expect(getSectionLabel('places', 'bg')).toBe('Места')
    expect(getSectionLabel('places', 'en')).toBe('Places')
  })

  it('normalizes human_stories to human-stories', () => {
    expect(getSectionLabel('human_stories', 'en')).toBe('Human stories')
  })

  it('returns public labels when configured', () => {
    expect(getSectionPublicLabel('gallery', 'en')).toBe('Gallery')
  })

  it('falls back to the raw section for unknown keys', () => {
    expect(getSectionLabel('unknown-section')).toBe('unknown-section')
  })

  it('returns default category bg', () => {
    expect(getSectionCategoryBg('news')).toBeTruthy()
    expect(getSectionCategoryBg('news')).not.toBe('Материал')
  })

  it('builds flat label maps for i18next', () => {
    const labels = sectionLabelsForLang('en')
    expect(labels.places).toBe('Places')
    expect(labels.news).toBe('News')
  })
})
