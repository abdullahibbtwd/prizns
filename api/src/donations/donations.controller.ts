import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DonationStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DonationsService } from './donations.service';

@Controller('cms/donations')
@UseGuards(JwtAuthGuard)
export class DonationsController {
  constructor(private readonly donations: DonationsService) {}

  @Get('trend')
  trend(@Query('granularity') granularity?: string) {
    const g = granularity?.trim().toLowerCase();
    const parsed =
      g === 'month' || g === 'year' || g === 'day' ? g : 'day';
    return this.donations.getCmsTrend(parsed);
  }

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ) {
    const normalized = status?.trim().toUpperCase();
    const parsedStatus =
      normalized &&
      (Object.values(DonationStatus) as string[]).includes(normalized)
        ? (normalized as DonationStatus)
        : undefined;

    return this.donations.listCms({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status: parsedStatus,
    });
  }
}
