import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import sharp from 'sharp';
import { processImageDerivatives } from './image-process';

describe('image-process', () => {
  it('writes webp full and thumbnail derivatives', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'prizn-img-'));
    const src = join(dir, 'src.jpg');
    try {
      await sharp({
        create: { width: 32, height: 24, channels: 3, background: 'navy' },
      })
        .jpeg()
        .toFile(src);

      const result = await processImageDerivatives(src);
      expect(result.full.length).toBeGreaterThan(0);
      expect(result.thumb.length).toBeGreaterThan(0);
      expect(result.width).toBe(32);
      expect(result.height).toBe(24);

      const fullMeta = await sharp(result.full).metadata();
      const thumbMeta = await sharp(result.thumb).metadata();
      expect(fullMeta.format).toBe('webp');
      expect(thumbMeta.format).toBe('webp');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects non-image bytes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'prizn-img-'));
    const src = join(dir, 'x.bin');
    try {
      await writeFile(src, Buffer.from('not-an-image'));
      await expect(processImageDerivatives(src)).rejects.toThrow('not a valid image');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
