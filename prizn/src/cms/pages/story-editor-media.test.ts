import { describe, expect, it } from 'vitest'
import {
  embedVideoMediaId,
  isEmbedVideoItem,
  mediaSaveFields,
  mergeBodyVideosIntoGallery,
  mergeLoadedMedia,
} from './story-editor-media'

const youtube = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

describe('embedVideoMediaId', () => {
  it('keys YouTube links by id', () => {
    expect(embedVideoMediaId(youtube)).toBe('embed-youtube-dQw4w9WgXcQ')
  })
})

describe('isEmbedVideoItem', () => {
  it('treats YouTube items as embeds', () => {
    expect(
      isEmbedVideoItem({
        id: 'embed-youtube-dQw4w9WgXcQ',
        kind: 'video',
        url: youtube,
      }),
    ).toBe(true)
  })

  it('does not treat uploaded files as embeds', () => {
    expect(
      isEmbedVideoItem({
        id: 'media-1',
        kind: 'video',
        url: 'https://cdn.example/clip.mp4',
      }),
    ).toBe(false)
  })
})

describe('mergeLoadedMedia', () => {
  it('puts an embed first when there is no hero image', () => {
    expect(
      mergeLoadedMedia({
        gallery: [
          { id: 'img-1', url: '/one.jpg', kind: 'IMAGE' },
        ],
        heroMediaId: null,
        videoUrl: youtube,
      }).map((item) => item.id),
    ).toEqual(['embed-youtube-dQw4w9WgXcQ', 'img-1'])
  })

  it('keeps photos first when an image is the hero', () => {
    expect(
      mergeLoadedMedia({
        gallery: [
          { id: 'img-1', url: '/one.jpg', kind: 'IMAGE' },
        ],
        heroMediaId: 'img-1',
        videoUrl: youtube,
      }).map((item) => item.id),
    ).toEqual(['img-1', 'embed-youtube-dQw4w9WgXcQ'])
  })

  it('does not duplicate an uploaded video already in the gallery', () => {
    expect(
      mergeLoadedMedia({
        gallery: [
          { id: 'vid-1', url: 'https://cdn.example/clip.mp4', kind: 'VIDEO' },
          { id: 'img-1', url: '/one.jpg', kind: 'IMAGE' },
        ],
        heroMediaId: 'vid-1',
        videoUrl: 'https://cdn.example/clip.mp4',
        videoMediaId: 'vid-1',
      }).map((item) => item.kind),
    ).toEqual(['video', 'image'])
  })
})

describe('mediaSaveFields', () => {
  it('clears hero when an embed is first', () => {
    expect(
      mediaSaveFields(
        [
          {
            id: 'embed-youtube-dQw4w9WgXcQ',
            kind: 'video',
            url: youtube,
          },
          { id: 'img-1', kind: 'image', url: '/one.jpg' },
        ],
        new Map(),
      ),
    ).toEqual({
      galleryMediaIds: ['img-1'],
      heroMediaId: null,
      videoUrl: youtube,
      videoMediaId: null,
    })
  })

  it('saves an uploaded video as hero and gallery media', () => {
    expect(
      mediaSaveFields(
        [
          { id: 'local-a', kind: 'video', url: 'blob:video', file: new File([], 'a.mp4') },
          { id: 'img-1', kind: 'image', url: '/one.jpg' },
        ],
        new Map([['local-a', 'vid-1']]),
      ),
    ).toEqual({
      galleryMediaIds: ['vid-1', 'img-1'],
      heroMediaId: 'vid-1',
      videoUrl: null,
      videoMediaId: 'vid-1',
    })
  })
})

describe('mergeBodyVideosIntoGallery', () => {
  it('adds extra body videos that are not already in the strip', () => {
    expect(
      mergeBodyVideosIntoGallery(
        [{ id: 'img-1', kind: 'image', url: '/one.jpg' }],
        [
          {
            type: 'video',
            url: youtube,
            mediaId: 'embed-youtube-dQw4w9WgXcQ',
          },
        ],
      ).map((item) => item.id),
    ).toEqual(['img-1', 'embed-youtube-dQw4w9WgXcQ'])
  })
})
