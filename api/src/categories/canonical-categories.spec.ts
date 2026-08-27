import {
  parseMergeFlag,
  resolveCategoryPlacement,
  shouldMarkSponsored,
} from './canonical-categories';

describe('resolveCategoryPlacement', () => {
  it('keeps the topic child and turns the city into a location tag', () => {
    expect(
      resolveCategoryPlacement(['kulturen-kalendar', 'vratza']),
    ).toEqual({
      primarySlug: 'kulturen-kalendar',
      categorySlugs: ['kulturen-kalendar'],
      locationSlugs: ['vratza'],
    });
  });

  it('does not let a city win over a topic when the city is listed first', () => {
    expect(
      resolveCategoryPlacement(['vidin', 'portreti']).primarySlug,
    ).toBe('portreti');
  });

  it('prefers the child that matches the article section', () => {
    expect(
      resolveCategoryPlacement(['mestni-legendi', 'portreti'], 'sports')
        .primarySlug,
    ).toBe('mestni-legendi');
    expect(
      resolveCategoryPlacement(['mestni-legendi', 'portreti'], 'human_stories')
        .primarySlug,
    ).toBe('portreti');
  });

  it('keeps a city as the category when default merge is off', () => {
    expect(
      resolveCategoryPlacement(['montana'], undefined, { noDefaultMerge: true }),
    ).toEqual({
      primarySlug: 'montana',
      categorySlugs: ['montana'],
      locationSlugs: ['montana'],
    });
  });

  it('sends city-only stories to Our places by default', () => {
    expect(resolveCategoryPlacement(['vratza'])).toEqual({
      primarySlug: 'nashite-mesta',
      categorySlugs: ['nashite-mesta'],
      locationSlugs: ['vratza'],
    });
  });

  it('sends Business to Human stories by default', () => {
    expect(resolveCategoryPlacement(['biznes']).primarySlug).toBe(
      'choveshki-istorii',
    );
  });

  it('marks Business stories as sponsored', () => {
    expect(shouldMarkSponsored(['biznes', 'vratza'])).toBe(true);
    expect(shouldMarkSponsored(['portreti'])).toBe(false);
  });

  it('merges a source slug onto another CMS category', () => {
    expect(
      resolveCategoryPlacement(['opik'], undefined, {
        merge: { opik: 'kampanii' },
      }).primarySlug,
    ).toBe('kampanii');
  });

  it('merges city-only stories into Our places while keeping the location tag', () => {
    expect(
      resolveCategoryPlacement(['vratza'], undefined, {
        merge: {
          vidin: 'nashite-mesta',
          vratza: 'nashite-mesta',
          montana: 'nashite-mesta',
        },
      }),
    ).toEqual({
      primarySlug: 'nashite-mesta',
      categorySlugs: ['nashite-mesta'],
      locationSlugs: ['vratza'],
    });
  });

  it('can also keep city category links', () => {
    expect(
      resolveCategoryPlacement(['intervyuta', 'vidin'], undefined, {
        alsoLinkCities: true,
      }).categorySlugs,
    ).toEqual(['intervyuta', 'vidin']);
  });
});

describe('parseMergeFlag', () => {
  it('parses slug:target pairs', () => {
    expect(parseMergeFlag('vidin:nashite-mesta,opik:kampanii')).toEqual({
      vidin: 'nashite-mesta',
      opik: 'kampanii',
    });
  });

  it('returns an empty map when unset', () => {
    expect(parseMergeFlag(undefined)).toEqual({});
    expect(parseMergeFlag('')).toEqual({});
  });
});
