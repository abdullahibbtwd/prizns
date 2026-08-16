import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SeoCmsController } from './seo-cms.controller';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';

@Module({
  imports: [AuthModule],
  controllers: [SeoController, SeoCmsController],
  providers: [SeoService],
})
export class SeoModule {}
