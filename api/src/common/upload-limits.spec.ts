import { PayloadTooLargeException } from '@nestjs/common';
import { MediaKind } from '@prisma/client';
import {
  assertUploadSize,
  detectMediaKind,
  IMAGE_MAX_BYTES,
  VIDEO_MAX_BYTES,
} from './upload-limits';

describe('upload limits', () => {
  it('detects media kind from mime', () => {
    expect(detectMediaKind('image/jpeg')).toBe(MediaKind.IMAGE);
    expect(detectMediaKind('video/mp4')).toBe(MediaKind.VIDEO);
    expect(detectMediaKind('audio/mpeg')).toBe(MediaKind.AUDIO);
  });

  it('rejects images over 10 MB', () => {
    expect(() => assertUploadSize(MediaKind.IMAGE, IMAGE_MAX_BYTES)).not.toThrow();
    expect(() =>
      assertUploadSize(MediaKind.IMAGE, IMAGE_MAX_BYTES + 1),
    ).toThrow(PayloadTooLargeException);
  });

  it('rejects videos over 100 MB', () => {
    expect(() => assertUploadSize(MediaKind.VIDEO, VIDEO_MAX_BYTES)).not.toThrow();
    expect(() =>
      assertUploadSize(MediaKind.VIDEO, VIDEO_MAX_BYTES + 1),
    ).toThrow(PayloadTooLargeException);
  });
});
