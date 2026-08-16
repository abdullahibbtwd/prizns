import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { overrideGuards } from '../../test/helpers/guards';
import { mockAuthUser } from '../../test/helpers/mocks';

describe('AuthController', () => {
  let controller: AuthController;
  const auth = {
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    setAuthCookies: jest.fn(),
    clearAuthCookies: jest.fn(),
    verifyEmail: jest.fn(),
    sendEmailVerification: jest.fn(),
  };
  const res = { cookie: jest.fn(), clearCookie: jest.fn() };

  beforeEach(async () => {
    auth.login.mockResolvedValue({
      user: mockAuthUser,
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    const builder = Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: auth }],
    });
    overrideGuards(builder, JwtAuthGuard);
    const module = await builder.compile();
    controller = module.get(AuthController);
  });

  it('delegates login to auth service', async () => {
    const req = { headers: {}, ip: '127.0.0.1' } as never;
    const result = await controller.login(
      { email: 'editor@prizni.bg', password: 'secret' },
      req,
      res as never,
    );
    expect(auth.login).toHaveBeenCalled();
    expect(auth.setAuthCookies).toHaveBeenCalled();
    expect(result.user).toEqual(mockAuthUser);
  });

  it('returns current user on me', () => {
    expect(controller.me(mockAuthUser)).toEqual({ user: mockAuthUser });
  });

  it('clears cookies on logout', async () => {
    auth.logout.mockResolvedValue(undefined);
    const req = { cookies: {} } as never;
    await expect(controller.logout(req, res as never)).resolves.toEqual({
      ok: true,
    });
    expect(auth.clearAuthCookies).toHaveBeenCalledWith(res);
  });

  it('verifies email for the current user', async () => {
    auth.verifyEmail.mockResolvedValue({ ...mockAuthUser, emailVerified: true });
    const result = await controller.verifyEmail(mockAuthUser, { code: '123456' });
    expect(auth.verifyEmail).toHaveBeenCalledWith(mockAuthUser.id, '123456');
    expect(result.user.emailVerified).toBe(true);
  });

  it('resends a verification code', async () => {
    auth.sendEmailVerification.mockResolvedValue({ sent: true });
    const req = { ip: '127.0.0.1' } as never;
    await expect(
      controller.resendVerification(mockAuthUser, req),
    ).resolves.toEqual({ ok: true });
    expect(auth.sendEmailVerification).toHaveBeenCalledWith(
      mockAuthUser.id,
      expect.objectContaining({ ip: '127.0.0.1' }),
    );
  });
});
