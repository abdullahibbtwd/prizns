import { describe, expect, it } from 'vitest'
import {
  alternateLocalePath,
  localeFromPath,
  stripLocalePrefix,
  withLocale,
} from './locale-path'

describe('locale-path', () => {
  it('detects locale from path', () => {
    expect(localeFromPath('/')).toBe('bg')
    expect(localeFromPath('/stories/a')).toBe('bg')
    expect(localeFromPath('/en')).toBe('en')
    expect(localeFromPath('/en/stories/a')).toBe('en')
  })

  it('strips and adds the /en prefix', () => {
    expect(stripLocalePrefix('/en/stories/a')).toBe('/stories/a')
    expect(withLocale('/stories/a', 'en')).toBe('/en/stories/a')
    expect(withLocale('/en/stories/a', 'bg')).toBe('/stories/a')
    expect(withLocale('/', 'en')).toBe('/en')
    expect(withLocale('/en', 'bg')).toBe('/')
  })

  it('preserves query and hash', () => {
    expect(withLocale('/stories?x=1', 'en')).toBe('/en/stories?x=1')
    expect(alternateLocalePath('/en/stories/a?from=1', 'bg')).toBe(
      '/stories/a?from=1',
    )
  })

  it('leaves cms and absolute urls alone', () => {
    expect(withLocale('/cms/stories', 'en')).toBe('/cms/stories')
    expect(withLocale('https://prizni.bg/x', 'en')).toBe('https://prizni.bg/x')
  })
})
