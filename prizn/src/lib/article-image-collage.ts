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

export type CollageTemplate =
  | 'hero-strip'
  | 'portrait-pair'
  | 'big-stack'
  | 'mosaic'
  | 'filmstrip'
  | 'equal-wide'
  | 'equal-tall'

export type CollageLayoutId = CollageTemplate | string

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

export const COLLAGE_TEMPLATES: CollageTemplate[] = [
  'hero-strip',
  'portrait-pair',
  'big-stack',
  'mosaic',
  'filmstrip',
  'equal-wide',
  'equal-tall',
]

const GRID_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  7: 'grid-cols-7',
  8: 'grid-cols-8',
  9: 'grid-cols-9',
  10: 'grid-cols-10',
  12: 'grid-cols-12',
}

const GRID_ROWS: Record<number, string> = {
  1: 'grid-rows-1',
  2: 'grid-rows-2',
  3: 'grid-rows-3',
  4: 'grid-rows-4',
  5: 'grid-rows-5',
  6: 'grid-rows-6',
  7: 'grid-rows-7',
  8: 'grid-rows-8',
  9: 'grid-rows-9',
}

export function collageTemplate(layout?: string | null): CollageTemplate {
  if (
    layout === 'hero-strip' ||
    layout === 'landscape' ||
    layout === 'wide' ||
    layout === 'row'
  ) {
    return 'hero-strip'
  }
  if (
    layout === 'portrait-pair' ||
    layout === 'portrait' ||
    layout === 'stack'
  ) {
    return 'portrait-pair'
  }
  if (layout === 'big-stack' || layout === 'top' || layout === 'hero') {
    return 'big-stack'
  }
  if (layout === 'filmstrip') return 'filmstrip'
  if (
    layout === 'equal-wide' ||
    layout === 'equal' ||
    layout === 'horizontal'
  ) {
    return 'equal-wide'
  }
  if (layout === 'equal-tall' || layout === 'vertical') return 'equal-tall'
  return 'mosaic'
}

export function collageLayoutIds(_count?: number): CollageTemplate[] {
  return [...COLLAGE_TEMPLATES]
}

export function resolveCollageLayout(
  _count: number,
  layout?: string | null,
): CollageTemplate {
  return collageTemplate(layout)
}

export function isSplitCollageLayout(layout?: string | null): boolean {
  const template = collageTemplate(layout)
  return template === 'hero-strip' || template === 'filmstrip'
}

export function collageColsClass(count: number): string {
  return GRID_COLS[Math.min(12, Math.max(1, count))] ?? 'grid-cols-3'
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y) {
    const next = x % y
    x = y
    y = next
  }
  return x || 1
}

function colSpanClass(span: number): string {
  const map: Record<number, string> = {
    1: '',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4',
    5: 'col-span-5',
    6: 'col-span-6',
    8: 'col-span-8',
    12: 'col-span-12',
  }
  return map[span] ?? ''
}

const TILE_ASPECT: Record<string, string> = {
  '1x1': 'aspect-square',
  '2x1': 'aspect-[2/1]',
  '2x2': 'aspect-square',
  '3x1': 'aspect-[3/1]',
  '3x2': 'aspect-[3/2]',
  '3x3': 'aspect-square',
  '4x2': 'aspect-[2/1]',
  '4x3': 'aspect-[4/3]',
  '5x2': 'aspect-[5/2]',
}

/** Columns for an equal photo grid: 2–3 rows once there are 4+ images. */
export function tileColumns(count: number): number {
  if (count <= 1) return 1
  if (count === 2) return 2
  if (count === 3) return 3
  if (count === 4) return 2
  if (count <= 6) return 3
  if (count <= 8) return 4
  if (count === 9) return 3
  return 5
}

export type EqualTilePlan = {
  cols: number
  rows: number
  gridCols: number
  remainder: number
  gridClass: string
  spanAt: (index: number) => string
}

/** Equal tiles with the last row stretched so the board has no empty holes. */
export function equalTilePlan(
  count: number,
  aspectClass?: string,
): EqualTilePlan {
  const n = Math.max(1, count)
  const cols = tileColumns(n)
  const rows = Math.max(1, Math.ceil(n / cols))
  const remainder = n % cols
  const gridCols = remainder === 0 ? cols : (cols / gcd(cols, remainder)) * remainder
  const normalSpan = remainder === 0 ? 1 : gridCols / cols
  const lastSpan = remainder === 0 ? 1 : gridCols / remainder
  const aspect =
    aspectClass ?? TILE_ASPECT[`${cols}x${rows}`] ?? 'aspect-square'
  return {
    cols,
    rows,
    gridCols,
    remainder,
    gridClass: `grid ${GRID_COLS[gridCols] ?? 'grid-cols-3'} ${GRID_ROWS[rows] ?? 'grid-rows-2'} ${aspect} gap-[2px]`,
    spanAt: (index: number) => {
      const span =
        remainder !== 0 && index >= n - remainder ? lastSpan : normalSpan
      return colSpanClass(span)
    },
  }
}

export function collageShellClass(
  layout: string = 'mosaic',
  density: 'article' | 'editor' | 'thumb' = 'article',
): string {
  if (density === 'thumb') return 'my-0 w-full'
  const template = collageTemplate(layout)
  const wide =
    template === 'hero-strip' ||
    template === 'filmstrip' ||
    template === 'equal-wide'
  if (density === 'article') {
    return wide
      ? 'mx-auto my-8 w-full max-w-xl sm:max-w-2xl'
      : 'mx-auto my-8 w-full max-w-[22rem] sm:max-w-[24rem]'
  }
  return wide
    ? 'mx-auto my-1 w-full max-w-lg'
    : 'mx-auto my-1 w-full max-w-[18rem]'
}

const FILL = 'min-h-0 h-full w-full'

export function collageGridClass(count: number, layout: string = 'mosaic'): string {
  const template = collageTemplate(layout)
  if (template === 'hero-strip' || template === 'filmstrip') return ''
  if (template === 'equal-wide') return equalTilePlan(count, 'aspect-[3/2]').gridClass
  if (template === 'equal-tall') return equalTilePlan(count, 'aspect-[3/4]').gridClass
  if (template === 'portrait-pair') return portraitPairGridClass(count)
  if (template === 'big-stack') return bigStackGridClass(count)
  return mosaicGridClass(count)
}

function mosaicGridClass(count: number): string {
  switch (count) {
    case 2:
      return 'grid grid-cols-3 grid-rows-2 aspect-square gap-[2px]'
    case 3:
      return 'grid grid-cols-2 grid-rows-2 aspect-square gap-[2px]'
    case 4:
      return 'grid grid-cols-3 grid-rows-2 aspect-square gap-[2px]'
    case 5:
      return 'grid grid-cols-3 grid-rows-3 aspect-square gap-[2px]'
    case 6:
      return 'grid grid-cols-3 grid-rows-3 aspect-square gap-[2px]'
    case 7:
      return 'grid grid-cols-3 grid-rows-3 aspect-square gap-[2px]'
    case 8:
      return 'grid grid-cols-4 grid-rows-3 aspect-square gap-[2px]'
    case 9:
      return 'grid grid-cols-3 grid-rows-3 aspect-square gap-[2px]'
    case 10:
      return 'grid grid-cols-4 grid-rows-3 aspect-square gap-[2px]'
    default:
      return 'grid grid-cols-2 aspect-square gap-[2px]'
  }
}

function portraitPairGridClass(count: number): string {
  if (count <= 3) {
    return `grid ${collageColsClass(count)} grid-rows-1 aspect-[3/4] gap-[2px]`
  }
  if (count === 4) {
    return 'grid grid-cols-2 grid-rows-2 aspect-[3/4] gap-[2px]'
  }
  if (count === 5) {
    return 'grid grid-cols-3 grid-rows-2 aspect-[3/4] gap-[2px]'
  }
  return `grid grid-cols-3 ${GRID_ROWS[Math.ceil(count / 3)] ?? 'grid-rows-3'} aspect-[3/4] gap-[2px]`
}

function bigStackGridClass(count: number): string {
  const rows = Math.max(1, count - 1)
  return `grid grid-cols-5 ${GRID_ROWS[rows] ?? 'grid-rows-2'} aspect-[3/2] gap-[2px]`
}

export function collageCellLayout(
  count: number,
  index: number,
  layout: string = 'mosaic',
): CollageCellLayout {
  const template = collageTemplate(layout)
  if (template === 'hero-strip') {
    if (index === 0) return { className: 'col-span-full', aspectClass: 'aspect-[16/9]' }
    return { className: '', aspectClass: 'aspect-square' }
  }
  if (template === 'filmstrip') {
    if (index === 0) return { className: 'w-full', aspectClass: 'aspect-[16/9]' }
    return {
      className: 'w-[22%] min-w-[3.25rem] shrink-0',
      aspectClass: 'aspect-square',
    }
  }
  if (template === 'equal-wide' || template === 'equal-tall') {
    const plan = equalTilePlan(
      count,
      template === 'equal-wide' ? 'aspect-[3/2]' : 'aspect-[3/4]',
    )
    return { className: plan.spanAt(index), aspectClass: FILL }
  }
  if (template === 'big-stack') {
    const rows = Math.max(1, count - 1)
    if (index === 0) {
      return {
        className: `col-span-3 ${rowSpanClass(rows)}`,
        aspectClass: FILL,
      }
    }
    return { className: 'col-span-2', aspectClass: FILL }
  }
  if (template === 'portrait-pair') {
    if (count === 5 && index === 4) {
      return { className: 'col-span-2', aspectClass: FILL }
    }
    return { className: '', aspectClass: FILL }
  }
  return mosaicCellLayout(count, index)
}

function rowSpanClass(rows: number): string {
  const map: Record<number, string> = {
    1: 'row-span-1',
    2: 'row-span-2',
    3: 'row-span-3',
    4: 'row-span-4',
    5: 'row-span-5',
    6: 'row-span-6',
    7: 'row-span-7',
    8: 'row-span-8',
    9: 'row-span-9',
  }
  return map[rows] ?? 'row-span-2'
}

function mosaicCellLayout(count: number, index: number): CollageCellLayout {
  if (count === 2) {
    if (index === 0) return { className: 'col-span-2', aspectClass: FILL }
    return { className: 'row-span-2', aspectClass: FILL }
  }
  if (count === 3) {
    if (index === 0) return { className: 'row-span-2', aspectClass: FILL }
    return { className: '', aspectClass: FILL }
  }
  if (count === 4) {
    if (index === 0) return { className: 'row-span-2', aspectClass: FILL }
    if (index === 1) return { className: 'col-span-2', aspectClass: FILL }
    return { className: '', aspectClass: FILL }
  }
  if (count === 5) {
    if (index === 0) return { className: 'col-span-2 row-span-2', aspectClass: FILL }
    return { className: '', aspectClass: FILL }
  }
  if (count === 6) {
    if (index === 0) return { className: 'col-span-2', aspectClass: FILL }
    if (index === 1) return { className: 'row-span-2', aspectClass: FILL }
    return { className: '', aspectClass: FILL }
  }
  if (count === 7) {
    if (index === 0) return { className: 'row-span-2', aspectClass: FILL }
    if (index === 1) return { className: 'col-span-2', aspectClass: FILL }
    return { className: '', aspectClass: FILL }
  }
  if (count === 8) {
    if (index === 0) return { className: 'col-span-2 row-span-2', aspectClass: FILL }
    if (index === 1) return { className: 'col-span-2', aspectClass: FILL }
    return { className: '', aspectClass: FILL }
  }
  if (count === 10) {
    if (index === 0) return { className: 'col-span-2', aspectClass: FILL }
    if (index === 1) return { className: 'row-span-2', aspectClass: FILL }
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
