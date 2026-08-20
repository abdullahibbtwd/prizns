import type { Role } from '@prisma/client';
import { primaryRole } from '../auth/role-access';
import { slugify } from '../common/slug.util';
import type { WpUser } from './types';

const WP_ROLE_MAP: Record<string, Role> = {
  administrator: 'ADMIN',
  editor: 'EDITOR',
  seo_manager: 'SEO_MANAGER',
  seo_editor: 'SEO_EDITOR',
  author: 'AUTHOR',
  contributor: 'CONTRIBUTOR',
  subscriber: 'SUBSCRIBER',
};

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
  roles: Role[];
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

export function mapWpRoles(roles: string[] | undefined): Role[] {
  const seen = new Set<Role>();
  const mapped: Role[] = [];
  for (const raw of roles ?? []) {
    const role = WP_ROLE_MAP[raw.toLowerCase()];
    if (role && !seen.has(role)) {
      seen.add(role);
      mapped.push(role);
    }
  }
  return mapped.length ? mapped : ['AUTHOR'];
}

export function mapWpRole(roles: string[] | undefined): Role {
  return primaryRole(mapWpRoles(roles));
}

export function mapWpUser(user: WpUser): MappedWpUser {
  const slug = (user.slug || slugify(user.name || `user-${user.id}`)).trim();
  const email = (user.email || `${slug}@imported.prizni.local`).toLowerCase().trim();
  const avatars = user.avatar_urls ?? {};
  const imageUrl =
    avatars['96'] || avatars['48'] || avatars['24'] || Object.values(avatars)[0] || null;

  const roles = mapWpRoles(user.roles);
  return {
    wpId: user.id,
    email,
    name: (user.name || slug).trim(),
    slug,
    bioBg: user.description?.trim() || null,
    imageUrl,
    role: primaryRole(roles),
    roles,
  };
}

export function wpUserAlias(wpId: number): string {
  return `wp-user:${wpId}`;
}
