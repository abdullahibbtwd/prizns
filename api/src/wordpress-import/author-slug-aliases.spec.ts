import {
  AUTHOR_SLUG_ALIASES,
  canonicalAuthorSlug,
  previousAuthorSlugs,
} from './author-slug-aliases';

describe('author slug aliases', () => {
  it('renames ami-tola to eva-ivanova', () => {
    expect(AUTHOR_SLUG_ALIASES['ami-tola']).toBe('eva-ivanova');
    expect(canonicalAuthorSlug('ami-tola')).toBe('eva-ivanova');
    expect(canonicalAuthorSlug('eva-ivanova')).toBe('eva-ivanova');
    expect(previousAuthorSlugs('eva-ivanova')).toEqual(['ami-tola']);
  });
});
