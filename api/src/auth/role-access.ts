import { Role } from '@prisma/client';

export const ROLE_RANK: Record<Role, number> = {
  SUBSCRIBER: 0,
  CONTRIBUTOR: 1,
  AUTHOR: 2,
  SEO_EDITOR: 3,
  SEO_MANAGER: 4,
  EDITOR: 5,
  MODERATOR: 5,
  ADMIN: 6,
};

/**
 * Role groups enforced by `@Roles(...)` on the API — the CMS menu mirrors these
 * in `prizn/src/lib/cms-roles.ts`, but hiding a menu item is never the guard.
 *
 * Super admin (ADMIN): everything, incl. settings, users/roles and permanent deletes.
 * Moderator (MODERATOR, legacy EDITOR): any story, submissions, gallery, authors,
 * newsletter, analytics, shop catalogue/orders.
 * Author / contributor: their own stories only, and only as draft or in review —
 * a moderator or super admin publishes.
 */
export const STAFF_ROLES: Role[] = [Role.ADMIN, Role.MODERATOR, Role.EDITOR];

/** Can open the story editor (own stories at least). */
export const STORY_WRITER_ROLES: Role[] = [
  ...STAFF_ROLES,
  Role.AUTHOR,
  Role.CONTRIBUTOR,
  Role.SEO_EDITOR,
];

/** Can edit stories written by anyone. */
export const ALL_STORIES_ROLES: Role[] = [...STAFF_ROLES, Role.SEO_EDITOR];

/** Can publish, schedule or archive; everyone else saves drafts and submits for review. */
export const PUBLISHER_ROLES: Role[] = STAFF_ROLES;

export const SEO_ROLES: Role[] = [
  ...STAFF_ROLES,
  Role.SEO_EDITOR,
  Role.SEO_MANAGER,
];

export const ANALYTICS_ROLES: Role[] = [...STAFF_ROLES, Role.SEO_MANAGER];

export const SUBMISSION_ROLES: Role[] = [...STAFF_ROLES, Role.CONTRIBUTOR];

export const SUPER_ADMIN_ROLES: Role[] = [Role.ADMIN];

export function normalizeRoles(
  primary?: Role | null,
  extras?: Role[] | null,
): Role[] {
  const seen = new Set<Role>();
  for (const role of [primary, ...(extras ?? [])]) {
    if (role) seen.add(role);
  }
  return Array.from(seen);
}

export function primaryRole(roles: Role[], fallback: Role = Role.SUBSCRIBER): Role {
  if (!roles.length) return fallback;
  return roles.reduce((best, role) =>
    ROLE_RANK[role] > ROLE_RANK[best] ? role : best,
  );
}

export function userHasAnyRole(
  user: { role: Role; roles?: Role[] | null },
  required: Role[],
): boolean {
  const held = normalizeRoles(user.role, user.roles);
  return required.some((role) => held.includes(role));
}

export function hasAdminRole(user: {
  role: Role;
  roles?: Role[] | null;
}): boolean {
  return userHasAnyRole(user, [Role.ADMIN]);
}

export function canManageAllStories(user: {
  role: Role;
  roles?: Role[] | null;
}): boolean {
  return userHasAnyRole(user, ALL_STORIES_ROLES);
}

export function canPublishStories(user: {
  role: Role;
  roles?: Role[] | null;
}): boolean {
  return userHasAnyRole(user, PUBLISHER_ROLES);
}
