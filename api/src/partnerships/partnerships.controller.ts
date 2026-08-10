import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PartnershipStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdatePartnershipDto } from './dto/update-partnership.dto';
import { PartnershipsService } from './partnerships.service';

@Controller('cms/partnerships')
@UseGuards(JwtAuthGuard)
export class PartnershipsController {
  constructor(private readonly partnerships: PartnershipsService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
  ) {
    const normalized = status?.trim().toUpperCase();
    const parsedStatus =
      normalized &&
      (Object.values(PartnershipStatus) as string[]).includes(normalized)
        ? (normalized as PartnershipStatus)
        : undefined;

    return this.partnerships.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      q,
      status: parsedStatus,
    });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.partnerships.getById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePartnershipDto) {
    return this.partnerships.update(id, dto);
  }
}
