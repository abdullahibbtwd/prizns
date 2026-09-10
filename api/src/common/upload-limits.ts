import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { MediaKind } from '@prisma/client';

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 200 * 1024 * 1024;
export const AUDIO_MAX_BYTES = 50 * 1024 * 1024;

/** Ceiling for Multer / nginx — the largest CMS payload (video). */
export const CMS_UPLOAD_CEILING_BYTES = VIDEO_MAX_BYTES;

export function maxBytesForKind(kind: MediaKind): number {
  if (kind === MediaKind.VIDEO) return VIDEO_MAX_BYTES;
  if (kind === MediaKind.AUDIO) return AUDIO_MAX_BYTES;
  return IMAGE_MAX_BYTES;
}

export function maxMbLabel(kind: MediaKind): number {
  return Math.round(maxBytesForKind(kind) / (1024 * 1024));
}

export function detectMediaKind(mime: string): MediaKind {
  const lower = mime.trim().toLowerCase();
  if (lower.startsWith('audio/')) return MediaKind.AUDIO;
  if (lower.startsWith('video/')) return MediaKind.VIDEO;
  return MediaKind.IMAGE;
}

export function assertUploadSize(kind: MediaKind, size: number) {
  if (!Number.isFinite(size) || size <= 0) {
    throw new BadRequestException('File is empty');
  }
  const max = maxBytesForKind(kind);
  if (size > max) {
    throw new PayloadTooLargeException(
      `File is too large (max ${maxMbLabel(kind)} MB for ${kind.toLowerCase()}s)`,
    );
  }
}
