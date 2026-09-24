/**
 * Client-side twin of api/src/common/translation-quality.ts
 * Keep behaviour in sync — used by the CMS editor before publish.
 */

export function translationLooksReady(
  bg: string,
  en: string | null | undefined,
): boolean {
  const source = bg.trim()
  const target = (en ?? '').trim()
  if (!source) return true
  if (!target) return false
  if (source === target) return false
  const cyrillic = (target.match(/\p{Script=Cyrillic}/gu) ?? []).length
  const latin = (target.match(/[A-Za-z]/g) ?? []).length
  if (cyrillic > 0 && cyrillic >= Math.max(latin, 1)) return false
  return true
}

export function plainTextFromHtml(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const GIBBERISH_RE =
  /\b(asdf|qwer|qwerty|lorem|ipsum|testtest|xxx+|aaaa+|bbbb+|dddd+|te?st\s*te?st|xxx\s*xxx)\b/i

export type BodyBlockLike = {
  type?: string
  textBg?: string | null
  textEn?: string | null
  labelBg?: string | null
  labelEn?: string | null
  captionBg?: string | null
  captionEn?: string | null
  url?: string | null
  mediaId?: string | null
  items?: Array<{
    url?: string | null
    mediaId?: string | null
    captionBg?: string | null
    captionEn?: string | null
  }>
}

export type PublishValidationIssue = {
  code:
    | 'translation_not_ready'
    | 'empty_block'
    | 'empty_collage'
    | 'gibberish'
  message: string
}

function blockPlain(block: BodyBlockLike): string {
  const parts = [
    block.textBg,
    block.textEn,
    block.labelBg,
    block.labelEn,
    block.captionBg,
    block.captionEn,
  ]
  if (block.items) {
    for (const item of block.items) {
      parts.push(item.captionBg, item.captionEn)
    }
  }
  return plainTextFromHtml(parts.filter(Boolean).join(' '))
}

function isEmptyParagraph(block: BodyBlockLike): boolean {
  if (block.type !== 'paragraph' && block.type !== 'heading') return false
  return !plainTextFromHtml(block.textBg) && !plainTextFromHtml(block.textEn)
}

function hasRealMediaRef(url?: string | null, mediaId?: string | null): boolean {
  if (mediaId?.trim()) return true
  const trimmed = url?.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('blob:')) return false
  return true
}

function isEmptyCollage(block: BodyBlockLike): boolean {
  if (block.type !== 'collage') return false
  const items = block.items ?? []
  if (items.length === 0) return true
  return items.every(
    (item) =>
      !hasRealMediaRef(item.url, item.mediaId) &&
      !plainTextFromHtml(item.captionBg),
  )
}

function isEmptyMediaBlock(block: BodyBlockLike): boolean {
  if (block.type !== 'image' && block.type !== 'video') return false
  return !hasRealMediaRef(block.url, block.mediaId)
}

export function validateStoryForPublish(input: {
  titleBg: string
  titleEn?: string | null
  subtitleBg?: string | null
  subtitleEn?: string | null
  translationStatus?: string | null
  body?: BodyBlockLike[] | null
}): PublishValidationIssue[] {
  const issues: PublishValidationIssue[] = []
  const body = input.body ?? []

  const titleReady = translationLooksReady(input.titleBg, input.titleEn)
  const subtitleReady =
    !input.subtitleBg?.trim() ||
    translationLooksReady(input.subtitleBg, input.subtitleEn)

  let bodyReady = true
  for (const block of body) {
    if (block.textBg?.trim() && !translationLooksReady(block.textBg, block.textEn)) {
      bodyReady = false
      break
    }
  }

  const markedReady = (input.translationStatus ?? '').toUpperCase() === 'READY'
  if (markedReady && (!titleReady || !subtitleReady || !bodyReady)) {
    issues.push({
      code: 'translation_not_ready',
      message:
        'Translation is marked READY but English still looks like a copy of the Bulgarian (or is empty).',
    })
  }

  for (const block of body) {
    if (isEmptyParagraph(block) || isEmptyMediaBlock(block)) {
      issues.push({
        code: 'empty_block',
        message: 'Story body contains an empty content block.',
      })
      break
    }
  }

  for (const block of body) {
    if (isEmptyCollage(block)) {
      issues.push({
        code: 'empty_collage',
        message: 'Story body contains an empty collage block.',
      })
      break
    }
  }

  const corpus = [
    input.titleBg,
    input.titleEn,
    input.subtitleBg,
    input.subtitleEn,
    ...body.map(blockPlain),
  ]
    .filter(Boolean)
    .join('\n')

  if (GIBBERISH_RE.test(corpus)) {
    issues.push({
      code: 'gibberish',
      message: 'Story still contains placeholder / test gibberish text.',
    })
  }

  return issues
}

export function stripEmptyBodyBlocks<T extends BodyBlockLike>(body: T[]): T[] {
  return body.filter(
    (block) =>
      !isEmptyParagraph(block) &&
      !isEmptyCollage(block) &&
      !isEmptyMediaBlock(block),
  )
}
