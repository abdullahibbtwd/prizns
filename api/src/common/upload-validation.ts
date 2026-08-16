import { BadRequestException } from '@nestjs/common';

export type UploadProfile = 'cms' | 'submission-photo' | 'submission-document';

const CMS_MIMES = /^(image\/|video\/|audio\/)/i;
const PHOTO_MIMES = /^image\//i;
const DOCUMENT_MIMES = /^(image\/|application\/pdf$)/i;

export function sanitizeStorageFolder(folder: string | undefined, fallback: string) {
  const raw = (folder ?? fallback).trim();
  const cleaned = raw
    .replace(/\\/g, '/')
    .replace(/\.\./g, '')
    .replace(/[^a-zA-Z0-9/_-]/g, '')
    .replace(/^\/+|\/+$/g, '')
    .slice(0, 64);
  return cleaned || fallback;
}

export function assertAllowedUploadMime(
  mimeType: string,
  profile: UploadProfile,
) {
  const mime = mimeType.trim().toLowerCase();
  if (!mime) {
    throw new BadRequestException('File type is required');
  }

  const allowed =
    profile === 'cms'
      ? CMS_MIMES.test(mime)
      : profile === 'submission-photo'
        ? PHOTO_MIMES.test(mime)
        : DOCUMENT_MIMES.test(mime);

  if (!allowed) {
    throw new BadRequestException(`File type not allowed: ${mimeType}`);
  }
}

export function assertSafeObjectKey(key: string) {
  const trimmed = key.trim();
  if (
    !trimmed ||
    trimmed.includes('..') ||
    trimmed.startsWith('/') ||
    !/^[a-zA-Z0-9][a-zA-Z0-9/_\-.*]*$/.test(trimmed)
  ) {
    throw new BadRequestException('Invalid storage key');
  }
  return trimmed;
}
