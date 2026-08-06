import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TranslationModule } from '../translation/translation.module';
import { PublicSeriesController } from './public-series.controller';
import { SeriesController } from './series.controller';
import { SeriesService } from './series.service';

@Module({
  imports: [AuthModule, TranslationModule],
  controllers: [SeriesController, PublicSeriesController],
  providers: [SeriesService],
  exports: [SeriesService],
})
export class SeriesModule {}
