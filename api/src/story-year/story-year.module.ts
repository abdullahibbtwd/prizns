import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ReaderAuthModule } from '../reader-auth/reader-auth.module'
import { StoryYearCmsController } from './story-year-cms.controller'
import { StoryYearPublicController } from './story-year-public.controller'
import { StoryYearService } from './story-year.service'

@Module({
  imports: [AuthModule, ReaderAuthModule],
  controllers: [StoryYearCmsController, StoryYearPublicController],
  providers: [StoryYearService],
  exports: [StoryYearService],
})
export class StoryYearModule {}
