import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { MinioHealthIndicator } from './minio.health';
import { RedisHealthIndicator } from './redis.health';

describe('HealthController', () => {
  let controller: HealthController;
  const health = { check: jest.fn().mockResolvedValue({ status: 'ok' }) };
  const prismaIndicator = { pingCheck: jest.fn() };
  const redis = { isHealthy: jest.fn() };
  const minio = { isHealthy: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: health },
        { provide: PrismaHealthIndicator, useValue: prismaIndicator },
        { provide: PrismaService, useValue: {} },
        { provide: RedisHealthIndicator, useValue: redis },
        { provide: MinioHealthIndicator, useValue: minio },
      ],
    }).compile();
    controller = module.get(HealthController);
  });

  it('runs health checks for database redis and minio', async () => {
    await controller.check();
    expect(health.check).toHaveBeenCalledWith(expect.any(Array));
  });
});
