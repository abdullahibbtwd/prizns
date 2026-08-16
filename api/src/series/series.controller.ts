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
import { TranslationService } from '../translation/translation.service';
import {
  CreateSeriesDto,
  SetSeriesEpisodesDto,
  UpdateSeriesDto,
} from './dto/series.dto';
import { SeriesService } from './series.service';

@Controller('cms/series')
@UseGuards(JwtAuthGuard)
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
  async create(@Body() dto: CreateSeriesDto) {
    const series = await this.series.create(dto);
    if (series.translationStatus === 'PENDING') {
      await this.translation.enqueueSeries(series.id);
    }
    return series;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSeriesDto) {
    const series = await this.series.update(id, dto);
    if (series.translationStatus === 'PENDING') {
      await this.translation.enqueueSeries(series.id);
    }
    return series;
  }

  @Put(':id/episodes')
  setEpisodes(@Param('id') id: string, @Body() dto: SetSeriesEpisodesDto) {
    return this.series.setEpisodes(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.series.remove(id);
  }
}
