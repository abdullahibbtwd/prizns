import { describe, expect, it } from 'vitest'
import {
  compactBody,
  convertBodyBlock,
  draftPlainTextForAi,
  emptyTextBlock,
  estimateReadMinutes,
  nextBodyMoveIndex,
  splitPastedParagraphs,
  syncBodyImagesWithGallery,
  toolbarTypeAction,
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
