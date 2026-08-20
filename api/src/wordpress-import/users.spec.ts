import { mapWpRole, mapWpRoles, mapWpUser, parseWpUsersJson, wpUserAlias } from './users';

describe('wordpress users', () => {
  it('maps WP roles onto CMS roles', () => {
    expect(mapWpRole(['administrator'])).toBe('ADMIN');
    expect(mapWpRole(['editor', 'author'])).toBe('EDITOR');
    expect(mapWpRoles(['editor', 'author'])).toEqual(['EDITOR', 'AUTHOR']);
    expect(mapWpRole(['author'])).toBe('AUTHOR');
    expect(mapWpRole(['subscriber'])).toBe('SUBSCRIBER');
    expect(mapWpRole([])).toBe('AUTHOR');
  });

  it('maps a WP user onto a CMS login + byline', () => {
    const mapped = mapWpUser({
      id: 42,
      name: 'Изабел Спасова',
      slug: 'izabel',
      email: 'izabel@prizni.bg',
      description: 'Емоционална и емпатична.',
      roles: ['author'],
      avatar_urls: { '96': 'https://prizni.bg/avatar.jpg' },
    });

    expect(mapped).toEqual({
      wpId: 42,
      email: 'izabel@prizni.bg',
      name: 'Изабел Спасова',
      slug: 'izabel',
      bioBg: 'Емоционална и емпатична.',
      imageUrl: 'https://prizni.bg/avatar.jpg',
      role: 'AUTHOR',
      roles: ['AUTHOR'],
    });
    expect(wpUserAlias(42)).toBe('wp-user:42');
  });

  it('falls back to a local email when WP hides it', () => {
    const mapped = mapWpUser({ id: 7, name: 'Guest', slug: 'guest' });
    expect(mapped.email).toBe('guest@imported.prizni.local');
  });

  it('parses a user array from dumped JSON', () => {
    expect(parseWpUsersJson([{ id: 1, name: 'Admin' }])).toHaveLength(1);
  });
});
