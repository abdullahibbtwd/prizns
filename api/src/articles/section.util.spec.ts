import {
  buildArticlePath,
  toPrismaSection,
  toPrismaSectionFilter,
  toPublicSection,
} from './section.util';

describe('section.util', () => {
  it('maps public stories slug to human_stories', () => {
    expect(toPrismaSection('stories')).toBe('human_stories');
    expect(toPrismaSection('human-stories')).toBe('human_stories');
  });

  it('throws for invalid section', () => {
    expect(() => toPrismaSection('invalid')).toThrow('Invalid section');
  });

  it('filters stories to featured and human_stories', () => {
    expect(toPrismaSectionFilter('stories')).toEqual({
      in: ['featured', 'human_stories'],
    });
    expect(toPrismaSectionFilter(undefined)).toBeUndefined();
  });

  it('maps prisma section to public slug', () => {
    expect(toPublicSection('human_stories')).toBe('human-stories');
    expect(toPublicSection('places')).toBe('places');
  });

  it('builds article paths', () => {
    expect(buildArticlePath('human_stories', 'my-slug')).toBe(
      '/stories/my-slug',
    );
    expect(buildArticlePath('places', 'plovdiv')).toBe('/places/plovdiv');
  });
});
