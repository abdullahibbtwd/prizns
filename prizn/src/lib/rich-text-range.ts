import { normalizeHref } from '@/lib/rich-text'

export const ZWSP = '\u200B'

export type SelectionMarks = {
  bold: boolean
  italic: boolean
  link: boolean
  list: boolean
}

export function closestAnchor(
  node: Node | null,
  root: HTMLElement,
): HTMLAnchorElement | null {
  let current: Node | null = node
  while (current && current !== root) {
    if (current instanceof HTMLElement && current.tagName === 'A') {
      return current as HTMLAnchorElement
    }
    current = current.parentNode
  }
  return null
}

function unwrapElement(el: HTMLElement) {
  const parent = el.parentNode
  if (!parent) return
  while (el.firstChild) parent.insertBefore(el.firstChild, el)
  parent.removeChild(el)
}

export function rangeIsUsable(range: Range | null, root: HTMLElement): range is Range {
  if (!range) return false
  try {
    if (!range.startContainer.isConnected) return false
    return root.contains(range.startContainer)
  } catch {
    return false
  }
}

export function expandRangeToWord(range: Range): Range {
  if (!range.collapsed) return range
  const node = range.startContainer
  if (node.nodeType !== Node.TEXT_NODE) return range
  const text = node.textContent ?? ''
  let start = range.startOffset
  let end = range.endOffset
  while (start > 0 && /\S/.test(text[start - 1] ?? '')) start -= 1
  while (end < text.length && /\S/.test(text[end] ?? '')) end += 1
  if (start === end) return range
  const next = range.cloneRange()
  next.setStart(node, start)
  next.setEnd(node, end)
  return next
}

export function wrapRangeWithLink(
  range: Range,
  href: string,
  root: HTMLElement,
): boolean {
  if (!rangeIsUsable(range, root)) return false
  const safeHref = normalizeHref(href)
  if (!safeHref) return false

  const working = expandRangeToWord(range)
  const startAnchor = closestAnchor(working.startContainer, root)

  if (working.collapsed) {
    if (startAnchor) {
      startAnchor.setAttribute('href', safeHref)
      return true
    }
    const a = document.createElement('a')
    a.setAttribute('href', safeHref)
    a.textContent = safeHref.replace(/^https?:\/\//, '')
    working.insertNode(a)
    selectNodeContents(a)
    return true
  }

  const endAnchor = closestAnchor(working.endContainer, root)
  if (startAnchor && startAnchor === endAnchor) {
    startAnchor.setAttribute('href', safeHref)
    selectNodeContents(startAnchor)
    return true
  }

  const contents = working.extractContents()
  contents.querySelectorAll('a').forEach((anchor) => unwrapElement(anchor))
  const a = document.createElement('a')
  a.setAttribute('href', safeHref)
  a.appendChild(contents)
  working.insertNode(a)
  selectNodeContents(a)
  return true
}

export function unlinkRange(range: Range, root: HTMLElement): boolean {
  if (!rangeIsUsable(range, root)) return false
  const startAnchor = closestAnchor(range.startContainer, root)
  const endAnchor = closestAnchor(range.endContainer, root)
  if (startAnchor && startAnchor === endAnchor) {
    unwrapElement(startAnchor)
    root.normalize()
    return true
  }
  if (range.collapsed) return false
  const contents = range.extractContents()
  const nested = contents.querySelectorAll('a')
  if (nested.length === 0) {
    range.insertNode(contents)
    return false
  }
  nested.forEach((anchor) => unwrapElement(anchor))
  range.insertNode(contents)
  root.normalize()
  return true
}

export function readSelectionMarks(root: HTMLElement): SelectionMarks {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || !sel.anchorNode || !root.contains(sel.anchorNode)) {
    return { bold: false, italic: false, link: false, list: false }
  }
  const node = sel.anchorNode
  const el =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as HTMLElement)
      : node.parentElement
  const inRoot = Boolean(el && root.contains(el))
  const boldDom = Boolean(inRoot && el?.closest('b, strong'))
  const italicDom = Boolean(inRoot && el?.closest('i, em'))
  const link = Boolean(inRoot && el?.closest('a'))
  const listDom = Boolean(inRoot && el?.closest('ul, ol'))
  let bold = boldDom
  let italic = italicDom
  let list = listDom
  try {
    bold = bold || document.queryCommandState('bold')
    italic = italic || document.queryCommandState('italic')
    list = list || document.queryCommandState('insertUnorderedList')
  } catch {
    /* queryCommandState is not always available */
  }
  return { bold, italic, link, list }
}

function selectNodeContents(node: Node) {
  const sel = window.getSelection()
  if (!sel) return
  const range = document.createRange()
  range.selectNodeContents(node)
  sel.removeAllRanges()
  sel.addRange(range)
}

function caretElement(root: HTMLElement): HTMLElement | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || !sel.anchorNode || !root.contains(sel.anchorNode)) {
    return null
  }
  const node = sel.anchorNode
  return node.nodeType === Node.ELEMENT_NODE
    ? (node as HTMLElement)
    : node.parentElement
}

function placeCaretInText(node: Text, offset: number) {
  const sel = window.getSelection()
  if (!sel) return
  const range = document.createRange()
  range.setStart(node, Math.max(0, Math.min(offset, node.length)))
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
}

/** Split the inline mark at the caret and leave the caret outside it. */
export function splitAndExitMark(root: HTMLElement, selector: string): boolean {
  const sel = window.getSelection()
  const el = caretElement(root)
  const mark = el?.closest(selector)
  if (!sel || !mark || !(mark instanceof HTMLElement) || mark === root) return false
  if (!sel.isCollapsed || sel.rangeCount === 0) return false

  const range = sel.getRangeAt(0)
  const afterRange = document.createRange()
  afterRange.selectNodeContents(mark)
  afterRange.setStart(range.endContainer, range.endOffset)
  const after = afterRange.extractContents()

  const parent = mark.parentNode
  if (!parent) return false

  const spacer = document.createTextNode(ZWSP)
  parent.insertBefore(spacer, mark.nextSibling)

  const leftover = after.textContent?.replace(/\u200B/g, '') ?? ''
  if (leftover) {
    const afterMark = mark.cloneNode(false) as HTMLElement
    afterMark.appendChild(after)
    parent.insertBefore(afterMark, spacer.nextSibling)
  }

  const leading = mark.textContent?.replace(/\u200B/g, '') ?? ''
  if (!leading) mark.remove()

  placeCaretInText(spacer, 1)
  return true
}

/** Start typing inside a new bold/italic wrapper. */
export function enterInlineMark(root: HTMLElement, tag: 'strong' | 'em'): boolean {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return false
  const node = sel.anchorNode
  if (!node || (!root.contains(node) && node !== root)) return false
  const range = sel.getRangeAt(0)
  if (!range.collapsed) return false
  const current = caretElement(root)
  const already = current?.closest(tag === 'strong' ? 'b, strong' : 'i, em')
  if (already && already !== root) return false

  const wrap = document.createElement(tag)
  const text = document.createTextNode(ZWSP)
  wrap.appendChild(text)
  range.insertNode(wrap)
  placeCaretInText(text, 1)
  return true
}
