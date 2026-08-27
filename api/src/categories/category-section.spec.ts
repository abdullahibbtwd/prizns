import { sectionFromCategorySlugs } from './category-section';

describe('sectionFromCategorySlugs', () => {
  it('maps a child slug before falling back', () => {
    expect(sectionFromCategorySlugs(['portreti'])).toBe('human_stories');
    expect(sectionFromCategorySlugs(['tvoyata-duma'])).toBe('voices');
    expect(sectionFromCategorySlugs(['novini'])).toBe('news');
    expect(sectionFromCategorySlugs(['biznes'])).toBe('human_stories');
  });

  it('uses the parent slug when the child is unknown', () => {
    expect(sectionFromCategorySlugs(['brand-new-child', 'choveshki-istorii'])).toBe(
      'human_stories',
    );
  });

  it('defaults to human stories', () => {
    expect(sectionFromCategorySlugs([])).toBe('human_stories');
    expect(sectionFromCategorySlugs(['unknown'])).toBe('human_stories');
  });
});
