import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
  }));
});

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(() => {
    const config = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'REDIS_HOST') return 'localhost';
        if (key === 'REDIS_PORT') return 6379;
        return undefined;
      }),
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    service = new RedisService(config);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('connects on module init', async () => {
    await service.onModuleInit();
    expect(service.client.connect).toHaveBeenCalled();
  });

  it('quits on module destroy', async () => {
    await service.onModuleDestroy();
    expect(service.client.quit).toHaveBeenCalled();
  });

  it('pings redis', async () => {
    await expect(service.ping()).resolves.toBe('PONG');
  });
});
