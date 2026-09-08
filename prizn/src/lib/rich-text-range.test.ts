import { describe, expect, it } from 'vitest'
import { splitAndExitMark, unlinkRange, wrapRangeWithLink } from './rich-text-range'

function mount(html: string) {
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.appendChild(root)
  return root
}

describe('wrapRangeWithLink', () => {
  it('wraps highlighted words in a link', () => {
    const root = mount('Hello world today')
    const text = root.firstChild as Text
    const range = document.createRange()
    range.setStart(text, 6)
    range.setEnd(text, 11)
    expect(wrapRangeWithLink(range, 'prizn.bg', root)).toBe(true)
    const link = root.querySelector('a')
    expect(link?.textContent).toBe('world')
    expect(link?.getAttribute('href')).toBe('https://prizn.bg')
    root.remove()
  })

  it('updates an existing link href', () => {
    const root = mount('<a href="https://old.bg">Prizn</a>')
    const range = document.createRange()
    range.selectNodeContents(root.querySelector('a')!)
    expect(wrapRangeWithLink(range, 'https://prizn.bg', root)).toBe(true)
    expect(root.querySelector('a')?.getAttribute('href')).toBe('https://prizn.bg')
    root.remove()
  })
})

describe('unlinkRange', () => {
  it('unwraps a link and keeps the words', () => {
    const root = mount('See <a href="https://prizn.bg">Prizn</a> now')
    const range = document.createRange()
    range.selectNodeContents(root.querySelector('a')!)
    expect(unlinkRange(range, root)).toBe(true)
    expect(root.querySelector('a')).toBeNull()
    expect(root.textContent).toBe('See Prizn now')
    root.remove()
  })
})

describe('splitAndExitMark', () => {
  it('moves the caret out of bold so the next characters are plain', () => {
    const root = mount('<strong>Hello</strong>')
    root.setAttribute('contenteditable', 'true')
    const strong = root.querySelector('strong')!
    const text = strong.firstChild as Text
    const range = document.createRange()
    range.setStart(text, text.length)
    range.collapse(true)
    const sel = window.getSelection()!
    sel.removeAllRanges()
    sel.addRange(range)
    expect(splitAndExitMark(root, 'b, strong')).toBe(true)
    expect(strong.contains(sel.anchorNode)).toBe(false)
    root.remove()
  })
})
