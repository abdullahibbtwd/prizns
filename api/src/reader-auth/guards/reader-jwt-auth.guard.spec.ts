import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ReaderJwtAuthGuard } from './reader-jwt-auth.guard';
import { READER_AUTH_COOKIES } from '../reader-auth.types';

describe('ReaderJwtAuthGuard', () => {
  const readerAuth = {
    assertEnabled: jest.fn(),
    validateAccessToken: jest.fn(),
  };

  const guard = new ReaderJwtAuthGuard(readerAuth as never);

  beforeEach(() => {
    readerAuth.validateAccessToken.mockResolvedValue({
      id: 'reader-1',
      email: 'reader@example.com',
      name: null,
      locale: 'bg',
    });
  });

  it('requires reader access cookie', async () => {
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ cookies: {} }) }),
    } as ExecutionContext;
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(readerAuth.assertEnabled).toHaveBeenCalled();
  });

  it('attaches reader on valid token', async () => {
    const req = {
      cookies: { [READER_AUTH_COOKIES.access]: 'reader-token' },
    };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as ExecutionContext;

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req).toHaveProperty('reader.email', 'reader@example.com');
  });
});
