import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TranslationModule } from '../translation/translation.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  imports: [AuthModule, TranslationModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
