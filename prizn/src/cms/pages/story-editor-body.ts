import type { BodyBlock } from '@/lib/cms-types'

export type TextBlockType = 'paragraph' | 'pullquote' | 'note' | 'caption'

/** Split pasted article text into paragraph blocks. */
export function splitPastedParagraphs(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!normalized) return []
  const byBlank = normalized
    .split(/\n\s*\n/)
    .map((chunk) => chunk.replace(/\n+/g, ' ').trim())
    .filter(Boolean)
  if (byBlank.length > 1) return byBlank
  const byLine = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  return byLine.length > 1 ? byLine : [normalized.replace(/\n+/g, ' ').trim()]
}

export function nextBodyMoveIndex(
  from: number,
  to: number,
  minIndex: number,
): { from: number; to: number } | null {
  if (from < minIndex || to < 0) return null
  const clampedTo = Math.max(minIndex, to)
  if (from === clampedTo) return null
  return { from, to: clampedTo }
}

export function splitTextAt(
  text: string,
  start: number,
  end = start,
): { before: string; after: string } {
  const from = Math.max(0, Math.min(start, text.length))
  const to = Math.max(from, Math.min(end, text.length))
  return { before: text.slice(0, from), after: text.slice(to) }
}

export function blockPlainText(block: BodyBlock): string {
  if (block.type === 'image' || block.type === 'video') return block.captionBg ?? ''
  if ('textBg' in block) return block.textBg
  return ''
}

export function emptyTextBlock(
  type: TextBlockType,
  defaultNoteLabel = 'Бележка',
): BodyBlock {
  return convertBodyBlock({ type: 'paragraph', textBg: '' }, type, defaultNoteLabel)
}

/** Empty current block → change its type. Block with text → insert a new one after. */
export function toolbarTypeAction(
  block: BodyBlock | undefined,
  nextType: TextBlockType,
): 'convert' | 'insert' | 'none' {
  if (!block || block.type === 'image' || block.type === 'video') return 'insert'
  const empty = !blockPlainText(block).trim()
  if (block.type === nextType) return empty ? 'none' : 'insert'
  return empty ? 'convert' : 'insert'
}

export function convertBodyBlock(
  block: BodyBlock,
  type: TextBlockType,
  defaultNoteLabel = 'Бележка',
): BodyBlock {
  const text = blockPlainText(block)
  if (type === 'paragraph') return { type, textBg: text }
  if (type === 'caption') return { type, textBg: text }
  if (type === 'pullquote') {
    return {
      type,
      textBg: text,
      citeBg: block.type === 'pullquote' ? block.citeBg : '',
    }
  }
  return {
    type: 'note',
    labelBg: block.type === 'note' && block.labelBg ? block.labelBg : defaultNoteLabel,
    textBg: text,
  }
}

export function syncBodyImagesWithGallery(
  body: BodyBlock[],
  gallery: Array<{
    id: string
    url?: string
    kind?: 'image' | 'video'
  }>,
): BodyBlock[] {
  const hero = gallery[0]
  const extras = gallery.filter((item) => item.id !== hero?.id)
  const extraById = new Map(extras.map((item) => [item.id, item]))
  const seen = new Set<string>()
  const kept: BodyBlock[] = []

  for (const block of body) {
    if (block.type !== 'image' && block.type !== 'video') {
      kept.push(block)
      continue
    }
    const id = block.mediaId
    if (id) {
      if (id === hero?.id || !extraById.has(id) || seen.has(id)) continue
      seen.add(id)
      kept.push(mediaBlockFromGallery(extraById.get(id)!, block))
      continue
    }
    if (hero?.url && block.url === hero.url) continue
    kept.push(block)
  }

  const missing = extras.filter((item) => !seen.has(item.id))
  if (missing.length === 0) return kept
  return [...kept, ...missing.map((item) => mediaBlockFromGallery(item))]
}

function mediaBlockFromGallery(
  item: { id: string; url?: string; kind?: 'image' | 'video' },
  existing?: Extract<BodyBlock, { type: 'image' | 'video' }>,
): BodyBlock {
  const captionBg = existing?.captionBg ?? ''
  if (item.kind === 'video') {
    return {
      type: 'video',
      mediaId: item.id,
      url: item.url ?? '',
      captionBg,
    }
  }
  return {
    type: 'image',
    mediaId: item.id,
    url: item.url ?? '',
    captionBg,
  }
}

export function compactBody(body: BodyBlock[]): BodyBlock[] {
  const kept = body.filter((block, index) => {
    if (index === 0 && block.type === 'paragraph') return true
    if (block.type === 'image' || block.type === 'video') {
      return Boolean(block.mediaId || block.url)
    }
    if (block.type === 'note') {
      return Boolean(block.textBg.trim() || block.labelBg.trim())
    }
    if ('textBg' in block) return Boolean(block.textBg.trim())
    return true
  })
  return kept.length > 0 ? kept : [{ type: 'paragraph', textBg: '' }]
}

const WORDS_PER_MINUTE = 200

export function estimateReadMinutes(body: BodyBlock[]): number {
  const text = body
    .map((block) => {
      if (block.type === 'image' || block.type === 'video') return block.captionBg ?? ''
      if (block.type === 'note') return `${block.labelBg} ${block.textBg}`
      if ('textBg' in block) return block.textBg
      return ''
    })
    .join(' ')
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE) || 1)
}

export function toFormBodyBlock(block: BodyBlock, galleryUrl?: string): BodyBlock {
  if (block.type === 'image' || block.type === 'video') {
    return {
      type: block.type,
      mediaId: block.mediaId,
      url: block.url || galleryUrl || '',
      captionBg: block.captionBg ?? '',
    }
  }
  if (block.type === 'pullquote') {
    return { type: 'pullquote', textBg: block.textBg ?? '', citeBg: block.citeBg ?? '' }
  }
  if (block.type === 'note') {
    return {
      type: 'note',
      labelBg: block.labelBg ?? '',
      textBg: block.textBg ?? '',
    }
  }
  if (block.type === 'caption') {
    return { type: 'caption', textBg: block.textBg ?? '' }
  }
  return { type: 'paragraph', textBg: block.textBg ?? '' }
}

export function draftPlainTextForAi(body: BodyBlock[]): string {
  return body
    .map((block) => {
      if (block.type === 'image' || block.type === 'video') {
        const caption = block.captionBg?.trim()
        return caption ? `[${block.type}] ${caption}` : ''
      }
      if (block.type === 'note') {
        return [`[note] ${block.labelBg}`, block.textBg].filter(Boolean).join('\n')
      }
      if (block.type === 'pullquote') {
        return [`[quote] ${block.textBg}`, block.citeBg].filter(Boolean).join('\n')
      }
      if (block.type === 'caption') return `[caption] ${block.textBg}`
      return block.textBg
    })
    .map((part) => part.trim())
    .filter(Boolean)
    .join('\n\n')
}
