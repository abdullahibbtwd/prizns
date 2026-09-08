import type { BodyBlock } from '@/lib/cms-types'
import { richTextToPlain, sanitizeRichText } from '@/lib/rich-text'
import { COLLAGE_MAX, COLLAGE_MIN } from '@/lib/article-image-collage'

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

export function blockStoredText(block: BodyBlock): string {
  if (block.type === 'image' || block.type === 'video') return block.captionBg ?? ''
  if (block.type === 'collage') {
    return [block.captionBg, ...block.items.map((item) => item.captionBg)]
      .filter(Boolean)
      .join(' ')
  }
  if ('textBg' in block) return block.textBg
  return ''
}

export function blockPlainText(block: BodyBlock): string {
  return richTextToPlain(blockStoredText(block))
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
  if (!block || block.type === 'image' || block.type === 'video' || block.type === 'collage')
    return 'insert'
  const empty = !blockPlainText(block).trim()
  if (block.type === nextType) return empty ? 'none' : 'insert'
  return empty ? 'convert' : 'insert'
}

export function convertBodyBlock(
  block: BodyBlock,
  type: TextBlockType,
  defaultNoteLabel = 'Бележка',
): BodyBlock {
  const text = blockStoredText(block)
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
    if (block.type === 'collage') {
      const items = block.items
        .map((item) => {
          const id = item.mediaId
          if (id && id === hero?.id) return null
          const extra = id ? extraById.get(id) : undefined
          if (id && !extra) return null
          if (id) seen.add(id)
          return {
            mediaId: id,
            url: extra?.url ?? item.url,
            captionBg: item.captionBg ?? '',
          }
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
      if (items.length >= 2) {
        kept.push({ ...block, items })
        continue
      }
      for (const item of items) {
        kept.push({
          type: 'image',
          mediaId: item.mediaId,
          url: item.url,
          captionBg: item.captionBg,
        })
      }
      continue
    }
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

function mappedMediaId(id: string | undefined, idMap: Map<string, string>) {
  if (!id) return id
  return idMap.get(id) || id
}

/** Replace local upload ids with saved media ids before persist. */
export function remapBodyMediaIds(
  body: BodyBlock[],
  idMap: Map<string, string>,
): BodyBlock[] {
  return body
    .map((block): BodyBlock | null => {
      if (block.type === 'collage') {
        return {
          type: 'collage',
          layout: block.layout || 'default',
          captionBg: block.captionBg ?? '',
          items: block.items.map((item) => ({
            mediaId: mappedMediaId(item.mediaId, idMap),
            url: item.url?.startsWith('blob:') ? undefined : item.url,
            captionBg: item.captionBg ?? '',
          })),
        }
      }
      if (block.type !== 'image' && block.type !== 'video') return block
      const mediaId = mappedMediaId(block.mediaId, idMap)
      if (block.type === 'image') {
        if (
          !mediaId ||
          mediaId.startsWith('local-') ||
          mediaId.startsWith('embed-')
        ) {
          return null
        }
        return {
          type: 'image',
          mediaId,
          captionBg: block.captionBg ?? '',
        }
      }
      if (mediaId?.startsWith('local-')) return null
      const url = block.url?.startsWith('blob:') ? undefined : block.url
      if (mediaId?.startsWith('embed-')) {
        if (!url) return null
        return {
          type: 'video',
          mediaId,
          url,
          captionBg: block.captionBg ?? '',
        }
      }
      if (!mediaId && !url) return null
      return {
        type: 'video',
        mediaId: mediaId || undefined,
        url,
        captionBg: block.captionBg ?? '',
      }
    })
    .filter((block): block is BodyBlock => Boolean(block))
}

export function compactBody(body: BodyBlock[]): BodyBlock[] {
  const kept = body.filter((block, index) => {
    if (index === 0 && block.type === 'paragraph') return true
    if (block.type === 'collage') {
      return block.items.filter((item) => item.mediaId || item.url).length >= 2
    }
    if (block.type === 'image' || block.type === 'video') {
      return Boolean(block.mediaId || block.url)
    }
    if (block.type === 'note') {
      return Boolean(richTextToPlain(block.textBg).trim() || block.labelBg.trim())
    }
    if ('textBg' in block) return Boolean(richTextToPlain(block.textBg).trim())
    return true
  })
  const cleaned = kept.map((block) => {
    if (block.type === 'note') {
      return { ...block, textBg: sanitizeRichText(block.textBg) }
    }
    if ('textBg' in block && (block.type === 'paragraph' || block.type === 'pullquote' || block.type === 'caption')) {
      return { ...block, textBg: sanitizeRichText(block.textBg) }
    }
    return block
  })
  return cleaned.length > 0 ? cleaned : [{ type: 'paragraph', textBg: '' }]
}

const WORDS_PER_MINUTE = 200

export function estimateReadMinutes(body: BodyBlock[]): number {
  const text = body
    .map((block) => {
      if (block.type === 'image' || block.type === 'video') return block.captionBg ?? ''
      if (block.type === 'collage') return blockPlainText(block)
      if (block.type === 'note') return `${block.labelBg} ${richTextToPlain(block.textBg)}`
      if ('textBg' in block) return richTextToPlain(block.textBg)
      return ''
    })
    .join(' ')
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE) || 1)
}

export function toFormBodyBlock(block: BodyBlock, galleryUrl?: string): BodyBlock {
  if (block.type === 'collage') {
    return {
      type: 'collage',
      layout: block.layout || 'default',
      captionBg: block.captionBg ?? '',
      items: block.items.map((item) => ({
        mediaId: item.mediaId,
        url: item.url,
        captionBg: item.captionBg ?? '',
      })),
    }
  }
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
      if (block.type === 'collage') {
        const caption = blockPlainText(block).trim()
        return caption ? `[collage] ${caption}` : ''
      }
      if (block.type === 'note') {
        return [`[note] ${block.labelBg}`, richTextToPlain(block.textBg)].filter(Boolean).join('\n')
      }
      if (block.type === 'pullquote') {
        return [`[quote] ${richTextToPlain(block.textBg)}`, block.citeBg].filter(Boolean).join('\n')
      }
      if (block.type === 'caption') return `[caption] ${richTextToPlain(block.textBg)}`
      return richTextToPlain(block.textBg)
    })
    .map((part) => part.trim())
    .filter(Boolean)
    .join('\n\n')
}

type ImageBodyBlock = Extract<BodyBlock, { type: 'image' }>

export function groupImagesIntoCollage(
  body: BodyBlock[],
  indexes: number[],
  layout = 'default',
): BodyBlock[] {
  const sorted = [...new Set(indexes)].sort((a, b) => a - b)
  const items: ImageBodyBlock[] = []
  for (const index of sorted) {
    const block = body[index]
    if (block?.type === 'image') items.push(block)
  }
  if (items.length < COLLAGE_MIN || items.length > COLLAGE_MAX) return body

  const collage: BodyBlock = {
    type: 'collage',
    layout,
    captionBg: '',
    items: items.map((item) => ({
      mediaId: item.mediaId,
      url: item.url,
      captionBg: item.captionBg ?? '',
    })),
  }
  const remove = new Set(sorted)
  const insertAt = sorted[0]!
  const next: BodyBlock[] = []
  body.forEach((block, index) => {
    if (index === insertAt) next.push(collage)
    if (!remove.has(index)) next.push(block)
  })
  return next
}

export function ungroupCollage(body: BodyBlock[], index: number): BodyBlock[] {
  const block = body[index]
  if (block?.type !== 'collage') return body
  const images: BodyBlock[] = block.items.map((item) => ({
    type: 'image',
    mediaId: item.mediaId,
    url: item.url,
    captionBg: item.captionBg ?? '',
  }))
  return [...body.slice(0, index), ...images, ...body.slice(index + 1)]
}

export function setCollageLayout(
  body: BodyBlock[],
  index: number,
  layout: string,
): BodyBlock[] {
  const block = body[index]
  if (block?.type !== 'collage') return body
  const next = [...body]
  next[index] = { ...block, layout }
  return next
}
