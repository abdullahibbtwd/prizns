import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';
import {
  createMockConfig,
  createMockJwt,
  createMockPrisma,
  createMockRedis,
} from '../../test/helpers/mocks';
import { AuthService } from './auth.service';
import { resetRateLimits } from '../common/rate-limit';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let redis: ReturnType<typeof createMockRedis>;
  let jwt: ReturnType<typeof createMockJwt>;
  const mail = {
    isConfigured: jest.fn().mockReturnValue(false),
    send: jest.fn(),
  };

  const user = {
    id: 'user-1',
    email: 'editor@prizni.bg',
    name: 'Editor',
    role: 'EDITOR' as const,
    isActive: true,
    passwordHash: 'hash',
    emailVerifiedAt: new Date('2026-01-01'),
    imageUrl: null,
  };

  beforeEach(async () => {
    resetRateLimits('auth-login');
    resetRateLimits('auth-verify-send');
    prisma = createMockPrisma({
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'rt-1' }),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    });
    redis = createMockRedis();
    redis.client.set = jest.fn().mockResolvedValue('OK');
    redis.client.get = jest.fn().mockResolvedValue(
      JSON.stringify({
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        createdAt: new Date().toISOString(),
      }),
    );
    redis.client.del = jest.fn().mockResolvedValue(1);
    jwt = createMockJwt();
    jwt.signAsync.mockResolvedValue('token');
    jwt.verifyAsync.mockResolvedValue({
      sub: user.id,
      sid: 'session-1',
      email: user.email,
      role: user.role,
      type: 'access',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: JwtService, useValue: jwt },
        {
          provide: ConfigService,
          useValue: createMockConfig({
            JWT_ACCESS_SECRET: 'access-secret',
            JWT_REFRESH_SECRET: 'refresh-secret',
            NODE_ENV: 'test',
          }),
        },
        { provide: MailService, useValue: mail },
      ],
    }).compile();

    service = module.get(AuthService);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    mail.isConfigured.mockReturnValue(false);
    mail.send.mockReset();
  });

  it('logs in with valid credentials', async () => {
    const result = await service.login(
      { email: 'editor@prizni.bg', password: 'secret' },
      {},
    );
    expect(result.user.email).toBe(user.email);
    expect(result.accessToken).toBe('token');
  });

  it('rejects invalid credentials', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    await expect(
      service.login({ email: user.email, password: 'wrong' }, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rate limits repeated login attempts', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    const email = 'brute@example.com';
    for (let i = 0; i < 5; i += 1) {
      await expect(
        service.login({ email, password: 'wrong' }, { ip: '1.2.3.4' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }
    await expect(
      service.login({ email, password: 'wrong' }, { ip: '1.2.3.4' }),
    ).rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });
  });

  it('validates access token against session', async () => {
    const payload = await service.validateAccessToken('access-token');
    expect(payload.id).toBe(user.id);
  });

  it('returns current user via me', async () => {
    const payload = await service.me(user.id);
    expect(payload.email).toBe(user.email);
  });

  it('rejects inactive user on me', async () => {
    prisma.user.findUnique = jest.fn().mockResolvedValue(null);
    await expect(service.me('missing')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('refreshes tokens when refresh token is valid', async () => {
    const refreshToken = 'refresh-token';
    jwt.verifyAsync.mockResolvedValueOnce({
      sub: user.id,
      sid: 'session-1',
      tid: 'rt-1',
      type: 'refresh',
    });
    prisma.refreshToken.findUnique = jest.fn().mockResolvedValue({
      id: 'rt-1',
      sessionId: 'session-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user,
    });
    prisma.refreshToken.update = jest.fn().mockResolvedValue({});

    const result = await service.refresh(refreshToken, {});
    expect(result.accessToken).toBe('token');
    expect(result.user.email).toBe(user.email);
  });

  it('rejects refresh when token is missing', async () => {
    await expect(service.refresh('', {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('logs out via refresh token', async () => {
    jwt.verifyAsync.mockResolvedValueOnce({
      sid: 'session-1',
      type: 'refresh',
    });
    await service.logout(undefined, 'refresh-token');
    expect(redis.client.del).toHaveBeenCalled();
    expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
  });

  it('sets and clears auth cookies', () => {
    const res = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
    service.setAuthCookies(res as never, {
      accessToken: 'access',
      refreshToken: 'refresh',
    });
    expect(res.cookie).toHaveBeenCalledTimes(2);

    service.clearAuthCookies(res as never);
    expect(res.clearCookie).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid access token', async () => {
    jwt.verifyAsync.mockRejectedValueOnce(new Error('bad token'));
    await expect(service.validateAccessToken('bad')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects when session is missing from redis', async () => {
    redis.client.get = jest.fn().mockResolvedValue(null);
    await expect(service.validateAccessToken('token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('issues a verification code for unverified users', async () => {
    const unverified = { ...user, emailVerifiedAt: null };
    prisma.user.findUnique = jest.fn().mockResolvedValue(unverified);
    redis.client.get = jest.fn().mockResolvedValue(null);
    redis.client.set = jest.fn().mockResolvedValue('OK');

    const result = await service.sendEmailVerification(user.id, {
      replaceExisting: true,
      skipCooldown: true,
    });
    expect(result.sent).toBe(true);
    expect(redis.client.set).toHaveBeenCalled();
  });

  it('rate limits verification code requests', async () => {
    const unverified = { ...user, emailVerifiedAt: null };
    prisma.user.findUnique = jest.fn().mockResolvedValue(unverified);
    redis.client.get = jest.fn().mockResolvedValue(null);
    redis.client.set = jest.fn().mockResolvedValue('OK');

    for (let i = 0; i < 3; i += 1) {
      await service.sendEmailVerification(user.id, {
        replaceExisting: true,
        skipCooldown: true,
        ip: '9.9.9.9',
      });
    }

    await expect(
      service.sendEmailVerification(user.id, {
        replaceExisting: true,
        skipCooldown: true,
        ip: '9.9.9.9',
      }),
    ).rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });
  });

  it('sends a welcome email when an account is created', async () => {
    const result = await service.sendAccountCreatedEmail(user.id);
    expect(result.sent).toBe(true);
  });

  it('emails a 15-minute code when an unverified user signs in', async () => {
    const unverified = { ...user, emailVerifiedAt: null };
    prisma.user.findUnique = jest.fn().mockResolvedValue(unverified);
    redis.client.get = jest.fn().mockResolvedValue(null);
    redis.client.set = jest.fn().mockResolvedValue('OK');

    const result = await service.login(
      { email: unverified.email, password: 'secret' },
      {},
    );
    expect(result.user.emailVerified).toBe(false);
    expect(redis.client.set).toHaveBeenCalled();
  });

  it('verifies a matching 6-digit code', async () => {
    const unverified = { ...user, emailVerifiedAt: null };
    const hash = createHash('sha256').update(`${user.id}:123456`).digest('hex');
    prisma.user.findUnique = jest.fn().mockResolvedValue(unverified);
    prisma.user.update = jest.fn().mockResolvedValue({
      ...unverified,
      emailVerifiedAt: new Date(),
    });
    redis.client.get = jest.fn().mockImplementation(async (key: string) => {
      if (String(key).includes('attempts')) return null;
      return hash;
    });
    redis.client.del = jest.fn().mockResolvedValue(1);

    const payload = await service.verifyEmail(user.id, '123456');
    expect(payload.emailVerified).toBe(true);
  });

  it('rejects an invalid verification code', async () => {
    const unverified = { ...user, emailVerifiedAt: null };
    const hash = createHash('sha256').update(`${user.id}:123456`).digest('hex');
    prisma.user.findUnique = jest.fn().mockResolvedValue(unverified);
    redis.client.get = jest.fn().mockImplementation(async (key: string) => {
      if (String(key).includes('attempts')) return '0';
      return hash;
    });
    redis.client.set = jest.fn().mockResolvedValue('OK');

    await expect(service.verifyEmail(user.id, '000000')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
