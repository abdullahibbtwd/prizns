import { Role } from '@prisma/client';
import {
  ALL_STORIES_ROLES,
  STAFF_ROLES,
  SUPER_ADMIN_ROLES,
  canManageAllStories,
  hasAdminRole,
  normalizeRoles,
  primaryRole,
  userHasAnyRole,
} from './role-access';

describe('role-access', () => {
  it('normalizes primary + extra roles without duplicates', () => {
    expect(normalizeRoles(Role.EDITOR, [Role.AUTHOR, Role.EDITOR])).toEqual([
      Role.EDITOR,
      Role.AUTHOR,
    ]);
  });

  it('picks the highest-ranked role as primary', () => {
    expect(primaryRole([Role.AUTHOR, Role.ADMIN, Role.EDITOR])).toBe(Role.ADMIN);
  });

  it('allows access when any held role matches', () => {
    expect(
      userHasAnyRole(
        { role: Role.EDITOR, roles: [Role.EDITOR, Role.AUTHOR] },
        [Role.AUTHOR],
      ),
    ).toBe(true);
    expect(
      userHasAnyRole({ role: Role.EDITOR, roles: [Role.EDITOR] }, [Role.ADMIN]),
    ).toBe(false);
  });

  it('detects admin from the roles array even if primary is lower', () => {
    expect(
      hasAdminRole({ role: Role.EDITOR, roles: [Role.EDITOR, Role.ADMIN] }),
    ).toBe(true);
  });

  it('gives moderators (and legacy editors) staff powers but not super-admin ones', () => {
    expect(STAFF_ROLES).toEqual(
      expect.arrayContaining([Role.ADMIN, Role.MODERATOR, Role.EDITOR]),
    );
    expect(STAFF_ROLES).not.toContain(Role.AUTHOR);
    expect(SUPER_ADMIN_ROLES).toEqual([Role.ADMIN]);
    expect(ALL_STORIES_ROLES).toContain(Role.MODERATOR);
  });

  it('limits authors and contributors to their own stories', () => {
    expect(canManageAllStories({ role: Role.MODERATOR })).toBe(true);
    expect(canManageAllStories({ role: Role.AUTHOR, roles: [Role.AUTHOR] })).toBe(false);
    expect(canManageAllStories({ role: Role.CONTRIBUTOR })).toBe(false);
  });
});
