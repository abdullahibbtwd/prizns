import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { StorageModule } from '../storage/storage.module';
import { HealthController } from './health.controller';
import { MinioHealthIndicator } from './minio.health';
import { RedisHealthIndicator } from './redis.health';

@Module({
  imports: [TerminusModule, StorageModule],
  controllers: [HealthController],
  providers: [RedisHealthIndicator, MinioHealthIndicator],
})
export class HealthModule {}
