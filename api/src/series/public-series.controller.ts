import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { SeriesService } from './series.service';

@Controller('series')
export class PublicSeriesController {
  constructor(private readonly series: SeriesService) {}

  @Get()
  list() {
    return this.series.listPublic();
  }

  @Get(':slug')
  async getBySlug(@Param('slug') slug: string) {
    const row = await this.series.getPublicBySlug(slug);
    if (!row) throw new NotFoundException('Series not found');
    return row;
  }
}
