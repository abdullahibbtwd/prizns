import {
  ensureUniqueSlug,
  randomSlugDigits,
  slugify,
} from './slug.util';

describe('slug.util', () => {
  describe('slugify', () => {
    it('normalizes latin titles', () => {
      expect(slugify('Hello World!')).toBe('hello-world');
    });

    it('preserves cyrillic characters', () => {
      expect(slugify('Пловдив')).toBe('пловдив');
    });

    it('returns untitled for empty input', () => {
      expect(slugify('   !!! ')).toBe('untitled');
    });

    it('truncates to 80 characters', () => {
      const long = 'a'.repeat(100);
      expect(slugify(long).length).toBeLessThanOrEqual(80);
    });
  });

  describe('randomSlugDigits', () => {
    it('returns zero-padded digits', () => {
      expect(randomSlugDigits(4)).toMatch(/^\d{4}$/);
    });
  });

  describe('ensureUniqueSlug', () => {
    it('returns base slug when available', async () => {
      const slug = await ensureUniqueSlug('My Title', async () => false);
      expect(slug).toBe('my-title');
    });

    it('appends digits when base is taken', async () => {
      const isTaken = jest
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      const slug = await ensureUniqueSlug('My Title', isTaken);
      expect(slug).toMatch(/^my-title-\d{7}$/);
    });
  });
});
