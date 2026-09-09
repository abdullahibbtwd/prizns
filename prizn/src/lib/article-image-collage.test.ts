import { describe, expect, it } from 'vitest'
import {
  collageCellLayout,
  collageGridClass,
  collageLayoutIds,
  collageShellClass,
  collageTemplate,
  isSplitCollageLayout,
  segmentBodyForCollage,
  tileColumns,
} from './article-image-collage'

const img = (n: number) => ({
  type: 'image' as const,
  url: `https://cdn.example/${n}.jpg`,
  text: `Photo ${n}`,
  textBg: `Снимка ${n}`,
})

describe('segmentBodyForCollage', () => {
  it('keeps a single extra photo as a full-width block', () => {
    const body = [
      { type: 'paragraph', url: undefined },
      img(1),
      { type: 'paragraph', url: undefined },
    ]
    const segments = segmentBodyForCollage(body)
    expect(segments.map((item) => item.kind)).toEqual([
      'block',
      'block',
      'block',
    ])
  })

  it('groups 2–10 consecutive extras into one collage', () => {
    const body = [{ type: 'paragraph' }, img(1), img(2), img(3)]
    const segments = segmentBodyForCollage(body)
    expect(segments).toHaveLength(2)
    expect(segments[0]?.kind).toBe('block')
    expect(segments[1]?.kind).toBe('collage')
    if (segments[1]?.kind === 'collage') {
      expect(segments[1].blocks).toHaveLength(3)
      expect(segments[1].blocks.map((item) => item.index)).toEqual([1, 2, 3])
    }
  })

  it('splits a run of 11 into a collage of 10 plus a lone photo', () => {
    const body = Array.from({ length: 11 }, (_, i) => img(i + 1))
    const segments = segmentBodyForCollage(body)
    expect(segments.map((item) => item.kind)).toEqual(['collage', 'block'])
    if (segments[0]?.kind === 'collage') {
      expect(segments[0].blocks).toHaveLength(10)
    }
  })

  it('does not collage images split by a paragraph', () => {
    const body = [img(1), { type: 'paragraph' }, img(2)]
    expect(segmentBodyForCollage(body).every((item) => item.kind === 'block')).toBe(
      true,
    )
  })

  it('skips videos so they stay standalone', () => {
    const body = [img(1), { type: 'video', url: 'https://cdn.example/a.mp4' }, img(2)]
    expect(segmentBodyForCollage(body).map((item) => item.kind)).toEqual([
      'block',
      'block',
      'block',
    ])
  })
})

describe('collageGridClass', () => {
  it('returns a distinct grid for each collage size', () => {
    expect(collageGridClass(2)).toContain('grid-cols-3')
    expect(collageGridClass(3)).toContain('grid-rows-2')
    expect(collageGridClass(9)).toContain('grid-cols-3')
    expect(collageGridClass(10)).toContain('grid-cols-4')
  })

  it('offers the editorial templates plus equal wide and tall grids', () => {
    expect(collageLayoutIds(3)).toEqual([
      'hero-strip',
      'portrait-pair',
      'big-stack',
      'mosaic',
      'filmstrip',
      'equal-wide',
      'equal-tall',
    ])
    expect(collageTemplate('default')).toBe('mosaic')
    expect(collageTemplate('landscape')).toBe('hero-strip')
    expect(collageTemplate('row')).toBe('hero-strip')
    expect(collageTemplate('portrait')).toBe('portrait-pair')
    expect(collageTemplate('top')).toBe('big-stack')
    expect(collageTemplate('horizontal')).toBe('equal-wide')
    expect(collageTemplate('vertical')).toBe('equal-tall')
  })

  it('uses a wide hero and square strip for hero-strip and filmstrip', () => {
    expect(isSplitCollageLayout('hero-strip')).toBe(true)
    expect(isSplitCollageLayout('filmstrip')).toBe(true)
    expect(collageGridClass(4, 'hero-strip')).toBe('')
    expect(collageCellLayout(4, 0, 'hero-strip').aspectClass).toContain('16/9')
    expect(collageCellLayout(4, 1, 'hero-strip').aspectClass).toContain('aspect-square')
    expect(collageCellLayout(4, 1, 'filmstrip').className).toContain('shrink-0')
    expect(collageShellClass('hero-strip', 'article')).toContain('max-w-xl')
    expect(collageShellClass('filmstrip', 'article')).toContain('max-w-xl')
  })

  it('places tall portraits side by side', () => {
    expect(collageGridClass(2, 'portrait-pair')).toContain('grid-cols-2')
    expect(collageGridClass(2, 'portrait-pair')).toContain('aspect-[3/4]')
    expect(collageGridClass(4, 'portrait-pair')).toContain('grid-rows-2')
  })

  it('anchors a large portrait beside stacked wide crops', () => {
    expect(collageGridClass(3, 'big-stack')).toContain('grid-cols-5')
    expect(collageGridClass(3, 'big-stack')).toContain('aspect-[3/2]')
    expect(collageCellLayout(3, 0, 'big-stack').className).toContain('col-span-3')
    expect(collageCellLayout(3, 0, 'big-stack').className).toContain('row-span-2')
    expect(collageCellLayout(3, 1, 'big-stack').className).toContain('col-span-2')
  })

  it('keeps mosaic as an asymmetric mix of tall and wide cells', () => {
    expect(collageCellLayout(2, 0, 'mosaic').className).toContain('col-span-2')
    expect(collageCellLayout(2, 1, 'mosaic').className).toContain('row-span-2')
    expect(collageCellLayout(3, 0, 'mosaic').className).toContain('row-span-2')
    expect(collageShellClass('mosaic', 'article')).toContain('max-w-[22rem]')
  })

  it('adds equal-size horizontal and vertical grids', () => {
    expect(tileColumns(4)).toBe(2)
    expect(tileColumns(5)).toBe(3)
    expect(tileColumns(8)).toBe(4)
    expect(collageGridClass(4, 'equal-wide')).toContain('aspect-[3/2]')
    expect(collageGridClass(4, 'equal-tall')).toContain('aspect-[3/4]')
    expect(collageGridClass(5, 'equal-wide')).toContain('grid-rows-2')
    expect(collageCellLayout(5, 4, 'equal-wide').className).toBe('col-span-3')
    expect(collageCellLayout(4, 0, 'equal-tall').className).toBe('')
    expect(collageShellClass('equal-wide', 'article')).toContain('max-w-xl')
  })
})
