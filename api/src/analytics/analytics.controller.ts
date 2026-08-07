import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService, type AnalyticsRange } from './analytics.service';

@Controller('cms/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('summary')
  summary(@Query('range') range?: string) {
    const normalized = (range || 'today').toLowerCase();
    const parsed: AnalyticsRange =
      normalized === 'week' || normalized === 'month' ? normalized : 'today';
    return this.analytics.summary(parsed);
  }
}
