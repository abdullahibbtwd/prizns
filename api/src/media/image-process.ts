import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { isSupportedImageFormat } from '../common/file-sniff';

export const IMAGE_FULL_MAX_EDGE = 2400;
export const IMAGE_THUMB_EDGE = 480;

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

export async function processImageDerivatives(filePath: string) {
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

  return {
    full,
    thumb,
    width: meta.width ?? null,
    height: meta.height ?? null,
  };
}
