import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { STAFF_ROLES } from '../auth/role-access';
import { TranslationService } from '../translation/translation.service';
import {
  CreateSeriesDto,
  SetSeriesEpisodesDto,
  UpdateSeriesDto,
} from './dto/series.dto';
import { SeriesService } from './series.service';

@Controller('cms/series')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SeriesController {
  constructor(
    private readonly series: SeriesService,
    private readonly translation: TranslationService,
  ) {}

  @Get()
  list() {
    return this.series.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.series.getById(id);
  }

  @Post()
  @Roles(...STAFF_ROLES)
  async create(@Body() dto: CreateSeriesDto) {
    const series = await this.series.create(dto);
    if (series.translationStatus === 'PENDING') {
      await this.translation.enqueueSeries(series.id);
    }
    return series;
  }

  @Patch(':id')
  @Roles(...STAFF_ROLES)
  async update(@Param('id') id: string, @Body() dto: UpdateSeriesDto) {
    const series = await this.series.update(id, dto);
    if (series.translationStatus === 'PENDING') {
      await this.translation.enqueueSeries(series.id);
    }
    return series;
  }

  @Put(':id/episodes')
  @Roles(...STAFF_ROLES)
  setEpisodes(@Param('id') id: string, @Body() dto: SetSeriesEpisodesDto) {
    return this.series.setEpisodes(id, dto);
  }

  @Delete(':id')
  @Roles(...STAFF_ROLES)
  remove(@Param('id') id: string) {
    return this.series.remove(id);
  }
}
