import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { isSupportedImageFormat } from '../common/file-sniff';
import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
} from '../common/share-image.util';

export const IMAGE_FULL_MAX_EDGE = 2400;
export const IMAGE_THUMB_EDGE = 480;
/** JPEG quality for Open Graph / social share derivatives. */
export const OG_JPEG_QUALITY = 82;

export async function assertDecodableImage(filePath: string) {
  try {
    const meta = await sharp(filePath, { failOn: 'error' }).metadata();
    if (!meta.format || !meta.width || !meta.height) {
      throw new BadRequestException('File is not a valid image');
    }
    if (!isSupportedImageFormat(meta.format)) {
      throw new BadRequestException(`Unsupported image format: ${meta.format}`);
    }
    return meta;
  } catch (error: unknown) {
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException('File is not a valid image');
  }
}

async function assertDecodableBuffer(buffer: Buffer) {
  try {
    const meta = await sharp(buffer, { failOn: 'error' }).metadata();
    if (!meta.format || !meta.width || !meta.height) {
      throw new BadRequestException('File is not a valid image');
    }
    if (!isSupportedImageFormat(meta.format)) {
      throw new BadRequestException(`Unsupported image format: ${meta.format}`);
    }
    return meta;
  } catch (error: unknown) {
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException('File is not a valid image');
  }
}

/**
 * Landscape social crop: cover-fit into 1200×630.
 * Allows mild upscaling so small sources still meet Facebook's recommended size.
 */
export async function processOgJpeg(
  input: string | Buffer,
): Promise<Buffer> {
  if (Buffer.isBuffer(input)) {
    await assertDecodableBuffer(input);
  } else {
    await assertDecodableImage(input);
  }

  return sharp(input, { failOn: 'error' })
    .rotate()
    .resize({
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      fit: 'cover',
      position: 'attention',
    })
    .jpeg({ quality: OG_JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
}

export async function processImageDerivatives(
  filePath: string,
  opts: { skipOg?: boolean } = {},
) {
  const meta = await assertDecodableImage(filePath);
  const full = await sharp(filePath, { failOn: 'error' })
    .rotate()
    .resize({
      width: IMAGE_FULL_MAX_EDGE,
      height: IMAGE_FULL_MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();

  const thumb = await sharp(filePath, { failOn: 'error' })
    .rotate()
    .resize({
      width: IMAGE_THUMB_EDGE,
      height: IMAGE_THUMB_EDGE,
      fit: 'cover',
      withoutEnlargement: true,
    })
    .webp({ quality: 75 })
    .toBuffer();

  const og = opts.skipOg ? null : await processOgJpeg(filePath);

  return {
    full,
    thumb,
    og,
    width: meta.width ?? null,
    height: meta.height ?? null,
  };
}
