const ALLOWED_TAGS = new Set(['STRONG', 'EM', 'A', 'BR', 'UL', 'OL', 'LI'])
const RENAME_TAGS: Record<string, string> = { B: 'STRONG', I: 'EM' }

export function normalizeHref(raw: string | null | undefined): string | null {
  const value = (raw ?? '').trim()
  if (!value) return null
  const lower = value.toLowerCase()
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:')
  ) {
    return null
  }
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('mailto:') ||
    value.startsWith('/')
  ) {
    return value
  }
  if (value.includes('.') && !value.includes(' ')) {
    return `https://${value}`
  }
  return null
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/g, '&quot;')
}

const DROP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEMPLATE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'LINK',
  'META',
])

function serializeAllowed(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeText((node.textContent ?? '').replace(/\u200B/g, ''))
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return ''
  const el = node as HTMLElement
  if (DROP_TAGS.has(el.tagName)) return ''
  const renamed = RENAME_TAGS[el.tagName]
  const tag = (renamed || el.tagName).toLowerCase()
  const inner = Array.from(el.childNodes).map(serializeAllowed).join('')
  if (tag === 'br') return '<br>'
  if (tag === 'strong' || tag === 'em') return inner ? `<${tag}>${inner}</${tag}>` : ''
  if (tag === 'ul' || tag === 'ol') return `<${tag}>${inner}</${tag}>`
  if (tag === 'li') return `<li>${inner}</li>`
  if (tag === 'a') {
    const href = normalizeHref(el.getAttribute('href'))
    if (!href) return inner
    return `<a href="${escapeAttr(href)}" rel="noopener noreferrer" target="_blank">${inner}</a>`
  }
  if (tag === 'span') {
    const style = el.getAttribute('style') ?? ''
    let wrapped = inner
    if (/font-weight\s*:\s*(bold|[6-9]00)/i.test(style)) {
      wrapped = `<strong>${wrapped}</strong>`
    }
    if (/font-style\s*:\s*italic/i.test(style)) {
      wrapped = `<em>${wrapped}</em>`
    }
    return wrapped
  }
  if (!ALLOWED_TAGS.has(el.tagName) && !renamed) return inner
  return inner
}

/** Keep only bold, italic, links, and lists. Existing plain text is unchanged. */
export function sanitizeRichText(html: string): string {
  if (!html) return ''
  if (typeof DOMParser === 'undefined') {
    return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
  }
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return ''
  return Array.from(root.childNodes).map(serializeAllowed).join('')
}

export function richTextToPlain(html: string): string {
  if (!html) return ''
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return html.replace(/&nbsp;/gi, ' ').trim()
  }
  if (typeof DOMParser === 'undefined') {
    return html
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim()
  }
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}

export function richTextIsEmpty(html: string): boolean {
  return !richTextToPlain(html)
}
