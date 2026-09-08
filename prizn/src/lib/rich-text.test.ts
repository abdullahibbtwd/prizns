import { describe, expect, it } from 'vitest'
import {
  normalizeHref,
  richTextIsEmpty,
  richTextToPlain,
  sanitizeRichText,
} from './rich-text'

describe('sanitizeRichText', () => {
  it('keeps bold, italic, and safe links', () => {
    expect(
      sanitizeRichText(
        'Hello <b>world</b> and <i>more</i> <a href="https://prizn.bg">here</a>',
      ),
    ).toBe(
      'Hello <strong>world</strong> and <em>more</em> <a href="https://prizn.bg" rel="noopener noreferrer" target="_blank">here</a>',
    )
  })

  it('drops scripts and unsafe hrefs', () => {
    expect(
      sanitizeRichText(
        'Hi <script>alert(1)</script><a href="javascript:alert(1)">x</a>',
      ),
    ).toBe('Hi x')
  })

  it('keeps lists', () => {
    expect(sanitizeRichText('<ul><li>One</li><li>Two</li></ul>')).toBe(
      '<ul><li>One</li><li>Two</li></ul>',
    )
  })

  it('turns styled spans into bold and italic', () => {
    expect(
      sanitizeRichText(
        '<span style="font-weight: 700">Bold</span> and <span style="font-style: italic">slant</span>',
      ),
    ).toBe('<strong>Bold</strong> and <em>slant</em>')
  })
})

describe('normalizeHref', () => {
  it('adds https to bare domains', () => {
    expect(normalizeHref('prizn.bg/story')).toBe('https://prizn.bg/story')
  })

  it('rejects javascript urls', () => {
    expect(normalizeHref('javascript:alert(1)')).toBeNull()
  })
})

describe('richTextToPlain', () => {
  it('strips tags for excerpts', () => {
    expect(richTextToPlain('Hello <strong>world</strong>')).toBe('Hello world')
  })

  it('treats empty markup as empty', () => {
    expect(richTextIsEmpty('<br>')).toBe(true)
    expect(richTextIsEmpty('<p></p>')).toBe(true)
  })
})
