import { Test, TestingModule } from '@nestjs/testing';
import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';
import {
  createMockConfig,
  createMockJwt,
  createMockPrisma,
  createMockRedis,
} from '../../test/helpers/mocks';
import { ReaderAuthService } from './reader-auth.service';

describe('ReaderAuthService', () => {
  let service: ReaderAuthService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let redis: ReturnType<typeof createMockRedis>;
  let jwt: ReturnType<typeof createMockJwt>;
  const mail = { isConfigured: jest.fn().mockReturnValue(false), send: jest.fn() };

  const reader = {
    id: 'reader-1',
    email: 'reader@example.com',
    name: null,
    locale: 'bg',
    lastLoginAt: new Date(),
  };

  beforeEach(async () => {
    prisma = createMockPrisma({
      reader: {
        findUnique: jest.fn().mockResolvedValue(reader),
        upsert: jest.fn().mockResolvedValue({ ...reader, lastLoginAt: null }),
        update: jest.fn().mockResolvedValue(reader),
      },
      magicLinkToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
      readerRefreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    });
    redis = createMockRedis();
    redis.client.set = jest.fn().mockResolvedValue('OK');
    redis.client.get = jest.fn().mockResolvedValue(
      JSON.stringify({
        readerId: reader.id,
        email: reader.email,
        name: reader.name,
        locale: reader.locale,
        createdAt: new Date().toISOString(),
      }),
    );
    jwt = createMockJwt();
    jwt.signAsync.mockResolvedValue('token');
    jwt.verifyAsync.mockResolvedValue({
      sub: reader.id,
      sid: 'session-1',
      email: reader.email,
      aud: 'reader',
      type: 'access',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReaderAuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: JwtService, useValue: jwt },
        {
          provide: ConfigService,
          useValue: createMockConfig({
            FEATURE_READER_AUTH: 'true',
            JWT_ACCESS_SECRET: 'access-secret',
            JWT_REFRESH_SECRET: 'refresh-secret',
          }),
        },
        { provide: MailService, useValue: mail },
      ],
    }).compile();

    service = module.get(ReaderAuthService);
  });

  it('is enabled by default', () => {
    expect(service.isEnabled()).toBe(true);
  });

  it('throws when disabled', () => {
    const disabled = new ReaderAuthService(
      prisma as never,
      redis as never,
      jwt as never,
      createMockConfig({ FEATURE_READER_AUTH: 'false' }) as never,
      mail as never,
    );
    expect(() => disabled.assertEnabled()).toThrow(ServiceUnavailableException);
  });

  it('returns authenticated response for returning reader', async () => {
    const result = await service.requestMagicLink(
      { email: reader.email },
      { ip: '127.0.0.1' },
    );
    expect(result).toMatchObject({ ok: true, authenticated: true });
  });

  it('validates reader access token', async () => {
    const payload = await service.validateAccessToken('token');
    expect(payload.email).toBe(reader.email);
  });

  it('returns reader via me', async () => {
    const payload = await service.me(reader.id);
    expect(payload.id).toBe(reader.id);
  });

  it('throws when reader missing on me', async () => {
    prisma.reader.findUnique = jest.fn().mockResolvedValue(null);
    await expect(service.me('missing')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('sends magic link for new reader', async () => {
    prisma.reader.findUnique = jest.fn().mockResolvedValue({
      ...reader,
      lastLoginAt: null,
    });
    prisma.reader.upsert = jest.fn().mockResolvedValue({
      ...reader,
      lastLoginAt: null,
    });
    prisma.magicLinkToken.create = jest.fn().mockResolvedValue({ id: 'ml-1' });

    const result = await service.requestMagicLink(
      { email: 'new@example.com' },
      { ip: '127.0.0.1' },
    );
    expect(result).toEqual({ ok: true, authenticated: false });
    expect(prisma.magicLinkToken.create).toHaveBeenCalled();
  });

  it('verifies magic link and issues session', async () => {
    const tokenRow = {
      id: 'ml-1',
      readerId: reader.id,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      returnUrl: '/stories/foo',
      intent: { type: 'save', articleId: 'art-1' },
      reader,
    };
    prisma.magicLinkToken.findUnique = jest.fn().mockResolvedValue(tokenRow);
    prisma.magicLinkToken.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    prisma.reader.update = jest.fn().mockResolvedValue(reader);

    const result = await service.verifyMagicLink('raw-token', {});
    expect(result.accessToken).toBe('token');
    expect(result.intent).toEqual({ type: 'save', articleId: 'art-1' });
  });

  it('rejects expired magic link', async () => {
    prisma.magicLinkToken.findUnique = jest.fn().mockResolvedValue({
      id: 'ml-1',
      expiresAt: new Date(Date.now() - 1000),
      reader,
    });
    await expect(service.verifyMagicLink('bad', {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('refreshes reader tokens', async () => {
    jwt.verifyAsync.mockResolvedValueOnce({
      sub: reader.id,
      sid: 'session-1',
      tid: 'rt-1',
      aud: 'reader',
      type: 'refresh',
    });
    prisma.readerRefreshToken.findUnique = jest.fn().mockResolvedValue({
      id: 'rt-1',
      sessionId: 'session-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      reader,
    });
    prisma.readerRefreshToken.update = jest.fn().mockResolvedValue({});

    const result = await service.refresh('refresh-token', {});
    expect(result.reader.email).toBe(reader.email);
  });

  it('sets and clears reader auth cookies', () => {
    const res = { cookie: jest.fn(), clearCookie: jest.fn() };
    service.setAuthCookies(res as never, {
      accessToken: 'access',
      refreshToken: 'refresh',
    });
    expect(res.cookie).toHaveBeenCalledTimes(2);
    service.clearAuthCookies(res as never);
    expect(res.clearCookie).toHaveBeenCalledTimes(2);
  });
});
