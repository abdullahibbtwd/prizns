import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AUTH_COOKIES } from '../auth/auth.types';
import { AnalyticsBeaconDto } from './dto/beacon.dto';
import { AnalyticsService } from './analytics.service';

function clientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim() || null;
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0]?.trim() || null;
  }
  return req.ip?.trim() || null;
}

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
    @Req() req: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    const cmsAccessToken = req.cookies?.[AUTH_COOKIES.access] as
      | string
      | undefined;
    return this.analytics.beacon(dto, userAgent, {
      cmsAccessToken,
      clientIp: clientIp(req),
    });
  }
}
