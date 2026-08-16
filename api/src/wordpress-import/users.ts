import type { Role } from '@prisma/client';
import { slugify } from '../common/slug.util';
import type { WpUser } from './types';

export type MappedWpUser = {
  wpId: number;
  email: string;
  name: string;
  slug: string;
  bioBg: string | null;
  imageUrl: string | null;
  /** Relative path inside an export package for a downloaded avatar. */
  imageFile?: string;
  role: Role;
};

export function parseWpUsersJson(raw: unknown): WpUser[] {
  if (Array.isArray(raw)) return raw as WpUser[];
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    if (Array.isArray(record.users)) return record.users as WpUser[];
    if (typeof record.id === 'number' && record.name) return [raw as WpUser];
  }
  throw new Error('Expected a WP user object, an array of users, or { users: [...] }');
}

export function mapWpRole(roles: string[] | undefined): Role {
  const set = new Set((roles ?? []).map((role) => role.toLowerCase()));
  if (set.has('administrator')) return 'ADMIN';
  if (set.has('editor')) return 'EDITOR';
  if (set.has('seo_manager')) return 'SEO_MANAGER';
  if (set.has('seo_editor')) return 'SEO_EDITOR';
  if (set.has('author')) return 'AUTHOR';
  if (set.has('contributor')) return 'CONTRIBUTOR';
  if (set.has('subscriber')) return 'SUBSCRIBER';
  return 'AUTHOR';
}

export function mapWpUser(user: WpUser): MappedWpUser {
  const slug = (user.slug || slugify(user.name || `user-${user.id}`)).trim();
  const email = (user.email || `${slug}@imported.prizni.local`).toLowerCase().trim();
  const avatars = user.avatar_urls ?? {};
  const imageUrl =
    avatars['96'] || avatars['48'] || avatars['24'] || Object.values(avatars)[0] || null;

  return {
    wpId: user.id,
    email,
    name: (user.name || slug).trim(),
    slug,
    bioBg: user.description?.trim() || null,
    imageUrl,
    role: mapWpRole(user.roles),
  };
}

export function wpUserAlias(wpId: number): string {
  return `wp-user:${wpId}`;
}
