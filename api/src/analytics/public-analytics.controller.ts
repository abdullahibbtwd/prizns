import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { AnalyticsBeaconDto } from './dto/beacon.dto';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class PublicAnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('popular')
  popular(@Query('limit') limit?: string) {
    const parsed = Number(limit);
    return this.analytics.popularStories(
      Number.isFinite(parsed) ? parsed : 5,
    );
  }

  @Post('beacon')
  beacon(
    @Body() dto: AnalyticsBeaconDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.analytics.beacon(dto, userAgent);
  }
}
