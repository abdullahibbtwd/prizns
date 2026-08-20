import { Role } from '@prisma/client';

export const ROLE_RANK: Record<Role, number> = {
  SUBSCRIBER: 0,
  CONTRIBUTOR: 1,
  AUTHOR: 2,
  SEO_EDITOR: 3,
  SEO_MANAGER: 4,
  EDITOR: 5,
  ADMIN: 6,
};

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
