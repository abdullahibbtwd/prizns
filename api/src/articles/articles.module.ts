import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { BadgesModule } from '../badges/badges.module';
import { DigestModule } from '../digest/digest.module';
import { StorageModule } from '../storage/storage.module';
import { TranslationModule } from '../translation/translation.module';
import { TtsModule } from '../tts/tts.module';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';

@Module({
  imports: [
    AuthModule,
    TranslationModule,
    TtsModule,
    StorageModule,
    BadgesModule,
    DigestModule,
    AiModule,
  ],
  controllers: [ArticlesController],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
