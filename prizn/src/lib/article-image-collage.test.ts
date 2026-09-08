import { describe, expect, it } from 'vitest'
import {
  collageCellLayout,
  collageGridClass,
  collageLayoutIds,
  segmentBodyForCollage,
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
    expect(collageGridClass(2)).toContain('grid-cols-2')
    expect(collageGridClass(3)).toContain('grid-rows-2')
    expect(collageGridClass(9)).toContain('grid-cols-3')
    expect(collageGridClass(10)).toContain('grid-cols-5')
  })

  it('offers extra layouts without losing the default', () => {
    expect(collageLayoutIds(3)).toEqual(['default', 'top', 'row'])
    expect(collageGridClass(2, 'wide')).toContain('grid-cols-3')
    expect(collageCellLayout(3, 0, 'top').className).toContain('col-span-2')
  })
})
