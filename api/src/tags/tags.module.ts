import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TranslationModule } from '../translation/translation.module';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';

@Module({
  imports: [AuthModule, TranslationModule],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
