import { describe, expect, it } from 'vitest'
import {
  assertCmsFileSize,
  CMS_IMAGE_MAX_BYTES,
  CMS_VIDEO_MAX_BYTES,
} from './upload-limits'

describe('cms upload limits', () => {
  it('allows images up to 10 MB and videos up to 200 MB', () => {
    expect(() =>
      assertCmsFileSize({ type: 'image/jpeg', size: CMS_IMAGE_MAX_BYTES }),
    ).not.toThrow()
    expect(() =>
      assertCmsFileSize({ type: 'video/mp4', size: CMS_VIDEO_MAX_BYTES }),
    ).not.toThrow()
  })

  it('rejects oversized photos and videos', () => {
    expect(() =>
      assertCmsFileSize({ type: 'image/png', size: CMS_IMAGE_MAX_BYTES + 1 }),
    ).toThrow(/max 10 MB/)
    expect(() =>
      assertCmsFileSize({ type: 'video/webm', size: CMS_VIDEO_MAX_BYTES + 1 }),
    ).toThrow(/max 200 MB/)
  })
})
