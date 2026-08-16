import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '../../src/prisma/prisma.service';
import type { RedisService } from '../../src/redis/redis.service';

/** Minimal Prisma mock; extend per test with model delegates. */
export function createMockPrisma(
  overrides: Record<string, unknown> = {},
): jest.Mocked<
  Pick<PrismaService, '$transaction' | '$connect' | '$disconnect'>
> &
  Record<string, unknown> {
  const prisma = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(async (arg: unknown) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      if (typeof arg === 'function')
        return (arg as (tx: unknown) => unknown)(prisma);
      return arg;
    }),
    ...overrides,
  };
  return prisma as never;
}

export function createMockConfig(
  values: Record<string, unknown> = {},
): jest.Mocked<Pick<ConfigService, 'get' | 'getOrThrow'>> {
  return {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      if (values[key] !== undefined) return values[key];
      return defaultValue;
    }),
    getOrThrow: jest.fn((key: string) => {
      if (values[key] === undefined) {
        throw new Error(`Config key missing: ${key}`);
      }
      return values[key];
    }),
  };
}

export function createMockRedis(): jest.Mocked<Pick<RedisService, 'client' | 'ping'>> {
  const client = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };
  return {
    client: client as never,
    ping: jest.fn().mockResolvedValue('PONG'),
  };
}

export function createMockJwt(): jest.Mocked<
  Pick<JwtService, 'signAsync' | 'verifyAsync'>
> {
  return {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };
}

export const mockUser = {
  id: 'user-1',
  email: 'editor@prizni.bg',
  name: 'Editor',
  role: 'EDITOR' as const,
};

export const mockAuthUser = {
  id: mockUser.id,
  email: mockUser.email,
  name: mockUser.name,
  role: mockUser.role,
  imageUrl: null,
  emailVerified: true,
};
