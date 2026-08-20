import { Role } from '@prisma/client';
import {
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
});
