import { describe, expect, it } from 'vitest'
import { pickLang } from './pick-lang'

describe('pickLang', () => {
  it('prefers Bulgarian copy when lang is bg', () => {
    expect(pickLang('bg', 'English', 'Български')).toBe('Български')
  })

  it('falls back to English for bg when Bulgarian is empty', () => {
    expect(pickLang('bg', 'English', '')).toBe('English')
  })

  it('prefers English copy when lang is en', () => {
    expect(pickLang('en', 'English', 'Български')).toBe('English')
  })

  it('falls back to Bulgarian for en when English is empty', () => {
    expect(pickLang('en', null, 'Български')).toBe('Български')
  })

  it('trims whitespace', () => {
    expect(pickLang('en', '  Title  ', '  ')).toBe('Title')
  })
})
