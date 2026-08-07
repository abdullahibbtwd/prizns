import { Body, Controller, Headers, Post } from '@nestjs/common';
import { AnalyticsBeaconDto } from './dto/beacon.dto';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class PublicAnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post('beacon')
  beacon(
    @Body() dto: AnalyticsBeaconDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.analytics.beacon(dto, userAgent);
  }
}
