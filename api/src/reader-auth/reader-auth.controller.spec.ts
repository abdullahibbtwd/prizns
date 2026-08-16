import { Test, TestingModule } from '@nestjs/testing';
import { ReaderAuthController } from './reader-auth.controller';
import { ReaderAuthService } from './reader-auth.service';

describe('ReaderAuthController', () => {
  let controller: ReaderAuthController;
  const readerAuth = {
    requestMagicLink: jest.fn(),
    verifyMagicLink: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    setAuthCookies: jest.fn(),
    clearAuthCookies: jest.fn(),
  };
  const res = { cookie: jest.fn(), clearCookie: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ReaderAuthController],
      providers: [{ provide: ReaderAuthService, useValue: readerAuth }],
    }).compile();
    controller = module.get(ReaderAuthController);
  });

  it('returns unauthenticated response for magic link request', async () => {
    readerAuth.requestMagicLink.mockResolvedValue({
      ok: true,
      authenticated: false,
    });
    const req = { headers: {}, ip: '127.0.0.1' } as never;
    await expect(
      controller.request({ email: 'r@example.com' }, req, res as never),
    ).resolves.toEqual({ ok: true, authenticated: false });
  });

  it('sets cookies when magic link authenticates immediately', async () => {
    readerAuth.requestMagicLink.mockResolvedValue({
      ok: true,
      authenticated: true,
      reader: { id: 'r1', email: 'r@example.com' },
      accessToken: 'a',
      refreshToken: 'r',
      intent: null,
      returnUrl: null,
    });
    const req = { headers: {}, ip: '127.0.0.1' } as never;
    await controller.request({ email: 'r@example.com' }, req, res as never);
    expect(readerAuth.setAuthCookies).toHaveBeenCalled();
  });

  it('clears cookies on logout', async () => {
    readerAuth.logout.mockResolvedValue(undefined);
    const req = { cookies: {} } as never;
    await expect(controller.logout(req, res as never)).resolves.toEqual({
      ok: true,
    });
    expect(readerAuth.clearAuthCookies).toHaveBeenCalledWith(res);
  });
});
