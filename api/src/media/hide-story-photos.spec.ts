import { shouldHideFromGallery } from './hide-story-photos';

describe('shouldHideFromGallery', () => {
  const keep = new Set(['events']);

  it('hides photos used in regular stories', () => {
    expect(
      shouldHideFromGallery(
        { key: 'cms/a.jpg', sections: ['human_stories'], usedOutsideStories: false },
        keep,
      ),
    ).toBe(true);
  });

  it('keeps event photos, even when a story also uses them', () => {
    expect(
      shouldHideFromGallery(
        { key: 'wp/1/a.jpg', sections: ['places', 'events'], usedOutsideStories: false },
        keep,
      ),
    ).toBe(false);
  });

  it('keeps media-library uploads that no story uses', () => {
    expect(
      shouldHideFromGallery(
        { key: 'cms/2026/sunset.jpg', sections: [], usedOutsideStories: false },
        keep,
      ),
    ).toBe(false);
  });

  it('hides unused WordPress imports, submissions and series/shop images', () => {
    expect(
      shouldHideFromGallery({ key: 'wp/9/x.jpg', sections: [], usedOutsideStories: false }, keep),
    ).toBe(true);
    expect(
      shouldHideFromGallery(
        { key: 'submissions/x.jpg', sections: [], usedOutsideStories: false },
        keep,
      ),
    ).toBe(true);
    expect(
      shouldHideFromGallery({ key: 'cms/cover.jpg', sections: [], usedOutsideStories: true }, keep),
    ).toBe(true);
  });
});
