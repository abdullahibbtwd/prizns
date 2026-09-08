import { describe, expect, it } from 'vitest'
import {
  compactBody,
  convertBodyBlock,
  draftPlainTextForAi,
  emptyTextBlock,
  estimateReadMinutes,
  groupImagesIntoCollage,
  nextBodyMoveIndex,
  remapBodyMediaIds,
  splitPastedParagraphs,
  syncBodyImagesWithGallery,
  toolbarTypeAction,
  ungroupCollage,
} from './story-editor-body'

describe('splitPastedParagraphs', () => {
  it('splits on blank lines', () => {
    expect(splitPastedParagraphs('First para.\n\nSecond para.')).toEqual([
      'First para.',
      'Second para.',
    ])
  })

  it('splits single line breaks when there is no blank line', () => {
    expect(splitPastedParagraphs('One\nTwo\nThree')).toEqual([
      'One',
      'Two',
      'Three',
    ])
  })

  it('keeps a single paragraph intact', () => {
    expect(splitPastedParagraphs('Just one paragraph.')).toEqual([
      'Just one paragraph.',
    ])
  })
})

describe('convertBodyBlock', () => {
  it('turns a paragraph into a pull quote without losing the text', () => {
    expect(
      convertBodyBlock({ type: 'paragraph', textBg: 'A line from the village.' }, 'pullquote'),
    ).toEqual({
      type: 'pullquote',
      textBg: 'A line from the village.',
      citeBg: '',
    })
  })

  it('turns a quote back into a paragraph', () => {
    expect(
      convertBodyBlock(
        { type: 'pullquote', textBg: 'Quoted.', citeBg: 'Ivan' },
        'paragraph',
      ),
    ).toEqual({ type: 'paragraph', textBg: 'Quoted.' })
  })
})

describe('toolbarTypeAction', () => {
  it('converts an empty paragraph and inserts after a written one', () => {
    expect(
      toolbarTypeAction({ type: 'paragraph', textBg: '' }, 'note'),
    ).toBe('convert')
    expect(
      toolbarTypeAction({ type: 'paragraph', textBg: 'Village morning.' }, 'note'),
    ).toBe('insert')
  })

  it('does not convert an empty block that is already that type', () => {
    expect(
      toolbarTypeAction({ type: 'note', labelBg: 'Бележка', textBg: '' }, 'note'),
    ).toBe('none')
  })
})

describe('emptyTextBlock', () => {
  it('builds a blank note', () => {
    expect(emptyTextBlock('note', 'Note')).toEqual({
      type: 'note',
      labelBg: 'Note',
      textBg: '',
    })
  })
})

describe('draftPlainTextForAi', () => {
  it('includes quotes, notes, and image captions', () => {
    expect(
      draftPlainTextForAi([
        { type: 'paragraph', textBg: 'Lead.' },
        { type: 'pullquote', textBg: 'We stayed.', citeBg: 'Ivan' },
        { type: 'image', mediaId: 'a', url: '/a.jpg', captionBg: 'Rocks' },
      ]),
    ).toContain('Lead.')
    expect(
      draftPlainTextForAi([
        { type: 'paragraph', textBg: 'Lead.' },
        { type: 'pullquote', textBg: 'We stayed.', citeBg: 'Ivan' },
        { type: 'image', mediaId: 'a', url: '/a.jpg', captionBg: 'Rocks' },
      ]),
    ).toContain('[quote] We stayed.')
    expect(
      draftPlainTextForAi([
        { type: 'paragraph', textBg: 'Lead.' },
        { type: 'image', mediaId: 'a', url: '/a.jpg', captionBg: 'Rocks' },
      ]),
    ).toContain('[image] Rocks')
  })
})

describe('syncBodyImagesWithGallery', () => {
  const gallery = [
    { id: 'hero', url: '/hero.jpg' },
    { id: 'a', url: '/a.jpg' },
    { id: 'b', url: '/b.jpg' },
  ]

  it('keeps the hero out of the body and adds extra photos', () => {
    expect(
      syncBodyImagesWithGallery(
        [
          { type: 'paragraph', textBg: 'Lead.' },
          { type: 'image', mediaId: 'hero', url: '/hero.jpg', captionBg: '' },
        ],
        gallery,
      ),
    ).toEqual([
      { type: 'paragraph', textBg: 'Lead.' },
      { type: 'image', mediaId: 'a', url: '/a.jpg', captionBg: '' },
      { type: 'image', mediaId: 'b', url: '/b.jpg', captionBg: '' },
    ])
  })

  it('puts every photo in the body when a video is the hero', () => {
    expect(
      syncBodyImagesWithGallery(
        [{ type: 'paragraph', textBg: 'Lead.' }],
        [
          { id: 'vid', url: 'https://youtu.be/x', kind: 'video' },
          { id: 'a', url: '/a.jpg', kind: 'image' },
          { id: 'b', url: '/b.jpg', kind: 'image' },
        ],
      ),
    ).toEqual([
      { type: 'paragraph', textBg: 'Lead.' },
      { type: 'image', mediaId: 'a', url: '/a.jpg', captionBg: '' },
      { type: 'image', mediaId: 'b', url: '/b.jpg', captionBg: '' },
    ])
  })

  it('puts extra videos in the body like extra photos', () => {
    expect(
      syncBodyImagesWithGallery(
        [{ type: 'paragraph', textBg: 'Lead.' }],
        [
          { id: 'hero', url: '/hero.jpg', kind: 'image' },
          { id: 'vid', url: 'https://youtu.be/x', kind: 'video' },
        ],
      ),
    ).toEqual([
      { type: 'paragraph', textBg: 'Lead.' },
      {
        type: 'video',
        mediaId: 'vid',
        url: 'https://youtu.be/x',
        captionBg: '',
      },
    ])
  })

  it('keeps a video hero out of the body', () => {
    expect(
      syncBodyImagesWithGallery(
        [
          { type: 'paragraph', textBg: 'Lead.' },
          {
            type: 'video',
            mediaId: 'vid',
            url: 'https://youtu.be/x',
            captionBg: '',
          },
        ],
        [
          { id: 'vid', url: 'https://youtu.be/x', kind: 'video' },
          { id: 'a', url: '/a.jpg', kind: 'image' },
        ],
      ),
    ).toEqual([
      { type: 'paragraph', textBg: 'Lead.' },
      { type: 'image', mediaId: 'a', url: '/a.jpg', captionBg: '' },
    ])
  })

  it('keeps an extra photo where the editor placed it', () => {
    expect(
      syncBodyImagesWithGallery(
        [
          { type: 'paragraph', textBg: 'One.' },
          { type: 'image', mediaId: 'b', url: '/b.jpg', captionBg: 'Rocks' },
          { type: 'paragraph', textBg: 'Two.' },
        ],
        gallery,
      ),
    ).toEqual([
      { type: 'paragraph', textBg: 'One.' },
      { type: 'image', mediaId: 'b', url: '/b.jpg', captionBg: 'Rocks' },
      { type: 'paragraph', textBg: 'Two.' },
      { type: 'image', mediaId: 'a', url: '/a.jpg', captionBg: '' },
    ])
  })
})

describe('compactBody', () => {
  it('drops empty extra paragraphs and keeps real content', () => {
    expect(
      compactBody([
        { type: 'paragraph', textBg: 'Kept.' },
        { type: 'paragraph', textBg: '' },
        { type: 'image', mediaId: '', url: '', captionBg: '' },
      ]),
    ).toEqual([{ type: 'paragraph', textBg: 'Kept.' }])
  })
})

describe('estimateReadMinutes', () => {
  it('uses about 200 words per minute', () => {
    const words = Array.from({ length: 400 }, (_, i) => `w${i}`).join(' ')
    expect(estimateReadMinutes([{ type: 'paragraph', textBg: words }])).toBe(2)
  })

  it('is at least one minute', () => {
    expect(estimateReadMinutes([{ type: 'paragraph', textBg: 'Hi' }])).toBe(1)
  })
})

describe('nextBodyMoveIndex', () => {
  it('lets an image move between paragraphs and blocks the teaser slot', () => {
    expect(nextBodyMoveIndex(4, 2, 1)).toEqual({ from: 4, to: 2 })
    expect(nextBodyMoveIndex(3, 0, 1)).toEqual({ from: 3, to: 1 })
    expect(nextBodyMoveIndex(2, 2, 1)).toBeNull()
  })
})

describe('remapBodyMediaIds', () => {
  it('rewrites collage item ids so first publish keeps the collage', () => {
    const remapped = remapBodyMediaIds(
      [
        { type: 'paragraph', textBg: 'Lead.' },
        {
          type: 'collage',
          layout: 'row',
          captionBg: '',
          items: [
            { mediaId: 'local-a', url: 'blob:a', captionBg: 'One' },
            { mediaId: 'local-b', url: 'blob:b', captionBg: 'Two' },
          ],
        },
      ],
      new Map([
        ['local-a', 'id-a'],
        ['local-b', 'id-b'],
      ]),
    )
    expect(remapped[1]).toMatchObject({
      type: 'collage',
      items: [
        { mediaId: 'id-a', captionBg: 'One' },
        { mediaId: 'id-b', captionBg: 'Two' },
      ],
    })
    expect(
      syncBodyImagesWithGallery(remapped, [
        { id: 'hero', url: '/hero.jpg' },
        { id: 'id-a', url: '/a.jpg' },
        { id: 'id-b', url: '/b.jpg' },
      ]),
    ).toMatchObject([
      { type: 'paragraph', textBg: 'Lead.' },
      {
        type: 'collage',
        items: [{ mediaId: 'id-a' }, { mediaId: 'id-b' }],
      },
    ])
  })
})

describe('groupImagesIntoCollage', () => {
  const body = [
    { type: 'paragraph' as const, textBg: 'Lead.' },
    { type: 'image' as const, mediaId: 'a', url: '/a.jpg', captionBg: 'One' },
    { type: 'image' as const, mediaId: 'b', url: '/b.jpg', captionBg: 'Two' },
    { type: 'image' as const, mediaId: 'c', url: '/c.jpg', captionBg: 'Three' },
  ]

  it('turns marked extra photos into one collage block', () => {
    const grouped = groupImagesIntoCollage(body, [1, 3], 'row')
    expect(grouped).toHaveLength(3)
    expect(grouped[1]).toMatchObject({
      type: 'collage',
      layout: 'row',
      items: [
        { mediaId: 'a', url: '/a.jpg' },
        { mediaId: 'c', url: '/c.jpg' },
      ],
    })
    expect(grouped[2]).toMatchObject({ type: 'image', mediaId: 'b' })
  })

  it('ungroups a collage back into extra photos', () => {
    const grouped = groupImagesIntoCollage(body, [1, 2])
    expect(ungroupCollage(grouped, 1).filter((block) => block.type === 'image')).toHaveLength(3)
  })

  it('keeps collage extras out of the leftover gallery sync', () => {
    const grouped = groupImagesIntoCollage(body, [1, 2])
    expect(
      syncBodyImagesWithGallery(grouped, [
        { id: 'hero', url: '/hero.jpg' },
        { id: 'a', url: '/a.jpg' },
        { id: 'b', url: '/b.jpg' },
        { id: 'c', url: '/c.jpg' },
      ]),
    ).toEqual([
      { type: 'paragraph', textBg: 'Lead.' },
      {
        type: 'collage',
        layout: 'default',
        captionBg: '',
        items: [
          { mediaId: 'a', url: '/a.jpg', captionBg: 'One' },
          { mediaId: 'b', url: '/b.jpg', captionBg: 'Two' },
        ],
      },
      { type: 'image', mediaId: 'c', url: '/c.jpg', captionBg: 'Three' },
    ])
  })
})
