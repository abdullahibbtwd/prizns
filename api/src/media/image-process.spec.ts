import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import sharp from 'sharp';
import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
} from '../common/share-image.util';
import { processImageDerivatives, processOgJpeg } from './image-process';

describe('image-process', () => {
  it('writes webp full, thumbnail, and og jpeg derivatives', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'prizn-img-'));
    const src = join(dir, 'src.jpg');
    try {
      await sharp({
        create: { width: 1600, height: 1200, channels: 3, background: 'navy' },
      })
        .jpeg()
        .toFile(src);

      const result = await processImageDerivatives(src);
      expect(result.full.length).toBeGreaterThan(0);
      expect(result.thumb.length).toBeGreaterThan(0);
      expect(result.og.length).toBeGreaterThan(0);
      expect(result.width).toBe(1600);
      expect(result.height).toBe(1200);

      const fullMeta = await sharp(result.full).metadata();
      const thumbMeta = await sharp(result.thumb).metadata();
      const ogMeta = await sharp(result.og).metadata();
      expect(fullMeta.format).toBe('webp');
      expect(thumbMeta.format).toBe('webp');
      expect(ogMeta.format).toBe('jpeg');
      expect(ogMeta.width).toBe(OG_IMAGE_WIDTH);
      expect(ogMeta.height).toBe(OG_IMAGE_HEIGHT);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('builds og jpeg from an existing webp buffer without mutating source', async () => {
    const webp = await sharp({
      create: { width: 800, height: 1200, channels: 3, background: 'green' },
    })
      .webp()
      .toBuffer();
    const before = Buffer.from(webp);

    const og = await processOgJpeg(webp);
    const meta = await sharp(og).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.width).toBe(OG_IMAGE_WIDTH);
    expect(meta.height).toBe(OG_IMAGE_HEIGHT);
    expect(Buffer.compare(webp, before)).toBe(0);
  });

  it('can skip og generation when derivative already exists', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'prizn-img-'));
    const src = join(dir, 'src.jpg');
    try {
      await sharp({
        create: { width: 64, height: 48, channels: 3, background: 'navy' },
      })
        .jpeg()
        .toFile(src);
      const result = await processImageDerivatives(src, { skipOg: true });
      expect(result.og).toBeNull();
      expect(result.full.length).toBeGreaterThan(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects non-image bytes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'prizn-img-'));
    const src = join(dir, 'x.bin');
    try {
      await writeFile(src, Buffer.from('not-an-image'));
      await expect(processImageDerivatives(src)).rejects.toThrow(
        'not a valid image',
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
