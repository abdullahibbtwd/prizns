import { BadRequestException } from '@nestjs/common';
import { MediaKind } from '@prisma/client';

const IMAGE_FORMATS = new Set(['jpeg', 'png', 'gif', 'webp', 'avif', 'heic']);

function ascii(buf: Buffer, start: number, length: number) {
  return buf.subarray(start, start + length).toString('ascii');
}

export function sniffMediaKind(header: Buffer): MediaKind | null {
  if (header.length < 12) return null;

  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return MediaKind.IMAGE;
  }
  if (
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47
  ) {
    return MediaKind.IMAGE;
  }
  if (ascii(header, 0, 3) === 'GIF') return MediaKind.IMAGE;
  if (ascii(header, 0, 4) === 'RIFF' && ascii(header, 8, 4) === 'WEBP') {
    return MediaKind.IMAGE;
  }
  if (ascii(header, 4, 4) === 'ftyp') {
    const brand = ascii(header, 8, 4).toLowerCase();
    if (
      brand.startsWith('avif') ||
      brand.startsWith('avis') ||
      brand.startsWith('heic') ||
      brand.startsWith('mif1')
    ) {
      return MediaKind.IMAGE;
    }
    return MediaKind.VIDEO;
  }
  // WebM / Matroska
  if (
    header[0] === 0x1a &&
    header[1] === 0x45 &&
    header[2] === 0xdf &&
    header[3] === 0xa3
  ) {
    return MediaKind.VIDEO;
  }
  if (ascii(header, 0, 3) === 'ID3') return MediaKind.AUDIO;
  if (header[0] === 0xff && (header[1] & 0xe0) === 0xe0) return MediaKind.AUDIO;
  if (ascii(header, 0, 4) === 'RIFF' && ascii(header, 8, 4) === 'WAVE') {
    return MediaKind.AUDIO;
  }
  if (ascii(header, 0, 4) === 'OggS') return MediaKind.AUDIO;
  if (ascii(header, 0, 4) === 'fLaC') return MediaKind.AUDIO;

  return null;
}

export function assertSniffMatchesKind(header: Buffer, declared: MediaKind) {
  const sniffed = sniffMediaKind(header);
  if (!sniffed) {
    throw new BadRequestException(
      'File content does not look like an image, video, or audio file',
    );
  }
  if (sniffed !== declared) {
    throw new BadRequestException(
      `File content is ${sniffed.toLowerCase()}, not ${declared.toLowerCase()}`,
    );
  }
}

export function isSupportedImageFormat(format: string | undefined) {
  return Boolean(format && IMAGE_FORMATS.has(format.toLowerCase()));
}
