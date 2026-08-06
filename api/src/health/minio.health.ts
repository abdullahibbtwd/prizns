import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class MinioHealthIndicator {
  constructor(
    private readonly storage: StorageService,
    private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicator.check(key);
    const ok = await this.storage.ping();
    return ok ? indicator.up() : indicator.down({ message: 'MinIO unavailable' });
  }
}
