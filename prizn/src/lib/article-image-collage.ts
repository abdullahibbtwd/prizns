export const COLLAGE_MIN = 2
export const COLLAGE_MAX = 10

export type ImageCollageBlock = {
  type: 'image'
  url: string
  text?: string
  textBg?: string
}

export type BodySegment<T> =
  | { kind: 'block'; block: T; index: number }
  | { kind: 'collage'; blocks: Array<{ block: ImageCollageBlock; index: number }> }

export type CollageCellLayout = {
  className: string
  aspectClass: string
}

function isCollageImage(
  block: { type: string; url?: string },
): block is ImageCollageBlock {
  return block.type === 'image' && Boolean(block.url)
}

/** Consecutive extra photos (2–10) become one collage. A lone photo stays full width. */
export function segmentBodyForCollage<T extends { type: string; url?: string }>(
  body: T[],
): BodySegment<T>[] {
  const segments: BodySegment<T>[] = []
  let i = 0
  while (i < body.length) {
    const start = i
    if (!isCollageImage(body[i]!)) {
      segments.push({ kind: 'block', block: body[i]!, index: i })
      i += 1
      continue
    }
    i += 1
    while (i < body.length && isCollageImage(body[i]!)) i += 1
    const runLength = i - start
    if (runLength < COLLAGE_MIN) {
      segments.push({ kind: 'block', block: body[start]!, index: start })
      continue
    }
    let cursor = start
    while (cursor < i) {
      const remaining = i - cursor
      const size = Math.min(COLLAGE_MAX, remaining)
      if (size < COLLAGE_MIN) {
        segments.push({ kind: 'block', block: body[cursor]!, index: cursor })
        cursor += 1
        continue
      }
      const blocks = []
      for (let offset = 0; offset < size; offset += 1) {
        const block = body[cursor + offset]!
        blocks.push({
          block: block as ImageCollageBlock,
          index: cursor + offset,
        })
      }
      segments.push({ kind: 'collage', blocks })
      cursor += size
    }
  }
  return segments
}

export type CollageLayoutId = string

const EXTRA_LAYOUTS: Record<number, string[]> = {
  2: ['wide', 'stack'],
  3: ['top', 'row'],
  4: ['hero'],
  5: ['row'],
  6: ['top'],
  7: ['equal'],
  8: ['equal'],
  9: ['row'],
  10: ['equal'],
}

export function collageLayoutIds(count: number): CollageLayoutId[] {
  const extras = EXTRA_LAYOUTS[count] ?? []
  return ['default', ...extras]
}

export function resolveCollageLayout(
  count: number,
  layout?: string | null,
): CollageLayoutId {
  const ids = collageLayoutIds(count)
  if (layout && ids.includes(layout)) return layout
  return 'default'
}

const FILL = 'min-h-0 h-full w-full'

export function collageGridClass(count: number, layout: string = 'default'): string {
  const resolved = resolveCollageLayout(count, layout)
  const extra = extraGridClass(count, resolved)
  if (extra) return extra
  switch (count) {
    case 2:
      return 'grid grid-cols-2 grid-rows-1 aspect-square gap-[2px]'
    case 3:
      return 'grid grid-cols-2 grid-rows-2 aspect-square gap-[2px]'
    case 4:
      return 'grid grid-cols-2 grid-rows-2 aspect-square gap-[2px]'
    case 5:
      return 'grid grid-cols-6 grid-rows-2 aspect-square gap-[2px]'
    case 6:
      return 'grid grid-cols-3 grid-rows-2 aspect-square gap-[2px]'
    case 7:
      return 'grid grid-cols-6 grid-rows-3 aspect-square gap-[2px]'
    case 8:
      return 'grid grid-cols-4 grid-rows-2 aspect-square gap-[2px]'
    case 9:
      return 'grid grid-cols-3 grid-rows-3 aspect-square gap-[2px]'
    case 10:
      return 'grid grid-cols-5 grid-rows-2 aspect-square gap-[2px]'
    default:
      return 'grid grid-cols-2 aspect-square gap-[2px]'
  }
}

function extraGridClass(count: number, layout: string): string | null {
  if (layout === 'wide' && count === 2) {
    return 'grid grid-cols-3 grid-rows-1 aspect-square gap-[2px]'
  }
  if (layout === 'stack' && count === 2) {
    return 'grid grid-cols-1 grid-rows-2 aspect-[3/4] gap-[2px]'
  }
  if (layout === 'top' && count === 3) {
    return 'grid grid-cols-2 grid-rows-2 aspect-square gap-[2px]'
  }
  if (layout === 'top' && count === 6) {
    return 'grid grid-cols-3 grid-rows-3 aspect-square gap-[2px]'
  }
  if (layout === 'row' && count === 3) {
    return 'grid grid-cols-3 grid-rows-1 aspect-[3/2] gap-[2px]'
  }
  if (layout === 'row' && count === 5) {
    return 'grid grid-cols-5 grid-rows-1 aspect-[5/2] gap-[2px]'
  }
  if (layout === 'row' && count === 9) {
    return 'grid grid-cols-3 grid-rows-3 aspect-square gap-[2px]'
  }
  if (layout === 'hero' && count === 4) {
    return 'grid grid-cols-2 grid-rows-3 aspect-square gap-[2px]'
  }
  if (layout === 'equal') {
    return 'grid grid-cols-3 aspect-square gap-[2px]'
  }
  return null
}

function extraCellLayout(
  count: number,
  index: number,
  layout: string,
): CollageCellLayout | null {
  if (layout === 'wide' && count === 2) {
    if (index === 0) return { className: 'col-span-2', aspectClass: FILL }
    return { className: '', aspectClass: FILL }
  }
  if (layout === 'stack' && count === 2) {
    return { className: '', aspectClass: FILL }
  }
  if (layout === 'top' && count === 3) {
    if (index === 0) return { className: 'col-span-2', aspectClass: FILL }
    return { className: '', aspectClass: FILL }
  }
  if (layout === 'top' && count === 6) {
    if (index === 0) return { className: 'col-span-3', aspectClass: FILL }
    return { className: '', aspectClass: FILL }
  }
  if (layout === 'row') {
    return { className: '', aspectClass: FILL }
  }
  if (layout === 'hero' && count === 4) {
    if (index === 0) return { className: 'row-span-3', aspectClass: FILL }
    return { className: '', aspectClass: FILL }
  }
  if (layout === 'equal') {
    return { className: '', aspectClass: FILL }
  }
  return null
}

export function collageCellLayout(
  count: number,
  index: number,
  layout: string = 'default',
): CollageCellLayout {
  const resolved = resolveCollageLayout(count, layout)
  const extra = extraCellLayout(count, index, resolved)
  if (extra) return extra
  if (count === 3) {
    if (index === 0) return { className: 'row-span-2', aspectClass: FILL }
    return { className: '', aspectClass: FILL }
  }
  if (count === 5) {
    if (index < 2) return { className: 'col-span-3', aspectClass: FILL }
    return { className: 'col-span-2', aspectClass: FILL }
  }
  if (count === 7) {
    if (index < 4) return { className: 'col-span-3', aspectClass: FILL }
    return { className: 'col-span-2', aspectClass: FILL }
  }
  if (count === 10) {
    return { className: '', aspectClass: FILL }
  }
  return { className: '', aspectClass: FILL }
}

/** True when this image sits in a consecutive extra-photo run that will collage. */
export function isInImageCollageRun(types: string[], index: number) {
  if (types[index] !== 'image') return false
  let start = index
  while (start > 0 && types[start - 1] === 'image') start -= 1
  let end = index
  while (end < types.length - 1 && types[end + 1] === 'image') end += 1
  const size = end - start + 1
  return size >= COLLAGE_MIN
}
