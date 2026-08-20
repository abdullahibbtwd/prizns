import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { AUTH_COOKIES } from '../auth.types';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ALLOW_UNVERIFIED_EMAIL_KEY } from '../decorators/allow-unverified-email.decorator';

describe('JwtAuthGuard', () => {
  const auth = {
    validateAccessToken: jest.fn(),
  };
  const reflector = {
    getAllAndOverride: jest.fn(),
  };

  const guard = new JwtAuthGuard(
    auth as never,
    reflector as unknown as Reflector,
  );

  const context = (cookies: Record<string, string> = {}) =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ cookies }),
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    auth.validateAccessToken.mockResolvedValue({
      id: 'user-1',
      email: 'editor@prizni.bg',
      role: 'EDITOR',
      name: 'Editor',
      emailVerified: true,
    });
  });

  it('rejects when access cookie is missing', async () => {
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches user and allows access with valid cookie', async () => {
    const req = { cookies: { [AUTH_COOKIES.access]: 'access-token' } };
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => req }),
    } as ExecutionContext;

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req).toHaveProperty('user.email', 'editor@prizni.bg');
    expect(auth.validateAccessToken).toHaveBeenCalledWith('access-token');
  });

  it('blocks unverified users from protected routes', async () => {
    auth.validateAccessToken.mockResolvedValue({
      id: 'user-1',
      email: 'new@prizni.bg',
      role: 'EDITOR',
      name: 'New',
      emailVerified: false,
    });
    const req = { cookies: { [AUTH_COOKIES.access]: 'access-token' } };
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => req }),
    } as ExecutionContext;

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows unverified users on decorated handlers', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === ALLOW_UNVERIFIED_EMAIL_KEY ? true : undefined,
    );
    auth.validateAccessToken.mockResolvedValue({
      id: 'user-1',
      email: 'new@prizni.bg',
      role: 'EDITOR',
      name: 'New',
      emailVerified: false,
    });
    const req = { cookies: { [AUTH_COOKIES.access]: 'access-token' } };
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => req }),
    } as ExecutionContext;

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });
});

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };
  const guard = new RolesGuard(reflector as unknown as Reflector);

  const context = (user?: { role: string; roles?: string[] }) =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
  });

  it('allows when no roles are required', () => {
    expect(guard.canActivate(context({ role: 'EDITOR' }))).toBe(true);
  });

  it('allows when user role matches', () => {
    reflector.getAllAndOverride.mockReturnValue(['EDITOR']);
    expect(guard.canActivate(context({ role: 'EDITOR' }))).toBe(true);
  });

  it('allows when any of the user roles matches', () => {
    reflector.getAllAndOverride.mockReturnValue(['AUTHOR']);
    expect(
      guard.canActivate(
        context({ role: 'EDITOR', roles: ['EDITOR', 'AUTHOR'] }),
      ),
    ).toBe(true);
  });

  it('rejects when role is insufficient', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    expect(() => guard.canActivate(context({ role: 'EDITOR' }))).toThrow(
      ForbiddenException,
    );
  });

  it('reads roles metadata from handler and class', () => {
    const handler = {};
    const klass = {};
    const ctx = {
      getHandler: () => handler,
      getClass: () => klass,
      switchToHttp: () => ({ getRequest: () => ({ user: { role: 'ADMIN' } }) }),
    } as ExecutionContext;
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    guard.canActivate(ctx);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      handler,
      klass,
    ]);
  });
});
