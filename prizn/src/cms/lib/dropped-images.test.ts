import { describe, expect, it } from 'vitest'
import { dropHasFiles, imageFilesFromDrop } from './dropped-images'

const jpg = new File(['hero'], 'hero.jpg', { type: 'image/jpeg' })
const png = new File(['extra'], 'extra.png', { type: 'image/png' })
const mp4 = new File(['clip'], 'clip.mp4', { type: 'video/mp4' })

describe('dropped-images', () => {
  it('detects OS file drags from dataTransfer types', () => {
    expect(dropHasFiles({ types: ['Files'] })).toBe(true)
    expect(dropHasFiles({ types: ['text/plain'] })).toBe(false)
    expect(dropHasFiles({ files: [jpg] })).toBe(true)
  })

  it('keeps only image files from a mixed drop', () => {
    expect(imageFilesFromDrop({ files: [jpg, mp4, png] })).toEqual([jpg, png])
  })

  it('reads images from dataTransfer items when files is empty', () => {
    expect(
      imageFilesFromDrop({
        files: [],
        items: [
          { kind: 'file', type: 'image/jpeg', getAsFile: () => jpg },
          { kind: 'string', type: 'text/uri-list', getAsFile: () => null },
        ],
      }),
    ).toEqual([jpg])
  })
})
