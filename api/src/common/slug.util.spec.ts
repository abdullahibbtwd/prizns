import {
  ensureUniqueSlug,
  randomSlugDigits,
  slugify,
  transliterateBg,
  truncateSlugAtWordBoundary,
} from './slug.util';

describe('slug.util', () => {
  describe('transliterateBg', () => {
    it('uses official Bulgarian Streamlined System', () => {
      expect(transliterateBg('Враца')).toBe('vratsa');
      expect(transliterateBg('Щастие')).toBe('shtastie');
      expect(transliterateBg('Човек')).toBe('chovek');
    });
  });

  describe('slugify', () => {
    it('normalizes latin titles', () => {
      expect(slugify('Hello World!')).toBe('hello-world');
    });

    it('transliterates cyrillic with official rules', () => {
      expect(slugify('Враца')).toBe('vratsa');
      expect(slugify('Пловдив')).toBe('plovdiv');
      expect(slugify('Дунав Ultra: Одисея 2026')).toBe(
        'dunav-ultra-odiseya-2026',
      );
    });

    it('returns untitled for empty input', () => {
      expect(slugify('   !!! ')).toBe('untitled');
    });

    it('truncates at a word boundary, not mid-word', () => {
      const long =
        'kratka-istoriya-za-dunava-i-horata-koito-zhiveyat-po-negoviya-bryag-i-oshte-dumi';
      const out = slugify(long);
      expect(out.length).toBeLessThanOrEqual(80);
      expect(out.endsWith('-')).toBe(false);
      // Must not end mid-token like "...bryag-i-osh"
      expect(out).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(out.split('-').every((part) => part.length > 0)).toBe(true);
    });
  });

  describe('truncateSlugAtWordBoundary', () => {
    it('cuts on the last hyphen within the budget', () => {
      expect(truncateSlugAtWordBoundary('alpha-beta-gamma-delta', 14)).toBe(
        'alpha-beta',
      );
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
