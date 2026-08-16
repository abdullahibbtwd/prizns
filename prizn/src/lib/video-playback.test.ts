import { describe, expect, it } from 'vitest'
import {
  formatWatchDuration,
  getRemotePosterUrl,
  resolveVideoPlayback,
} from './video-playback'

describe('resolveVideoPlayback', () => {
  it('parses youtube watch urls', () => {
    const playback = resolveVideoPlayback(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    )
    expect(playback).toMatchObject({
      kind: 'youtube',
      id: 'dQw4w9WgXcQ',
    })
  })

  it('parses youtube short links', () => {
    const playback = resolveVideoPlayback('https://youtu.be/abc123XYZ12')
    expect(playback?.kind).toBe('youtube')
    expect(playback && 'id' in playback && playback.id).toBe('abc123XYZ12')
  })

  it('parses vimeo urls', () => {
    const playback = resolveVideoPlayback('https://vimeo.com/123456789')
    expect(playback).toMatchObject({
      kind: 'vimeo',
      id: '123456789',
    })
  })

  it('falls back to direct file urls', () => {
    const src = 'https://cdn.example/video.mp4'
    expect(resolveVideoPlayback(src)).toEqual({ kind: 'file', src })
  })

  it('returns null for empty input', () => {
    expect(resolveVideoPlayback('   ')).toBeNull()
  })
})

describe('getRemotePosterUrl', () => {
  it('returns a youtube thumbnail url', () => {
    expect(
      getRemotePosterUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    ).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
  })

  it('returns null for file playback', () => {
    expect(getRemotePosterUrl('https://cdn.example/video.mp4')).toBeNull()
  })
})

describe('formatWatchDuration', () => {
  it('rounds to whole minutes', () => {
    expect(formatWatchDuration(125)).toBe('2 min')
  })

  it('returns empty string for short durations', () => {
    expect(formatWatchDuration(0)).toBe('')
  })
})
