import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { BullModule } from '@nestjs/bullmq'
import { AiModule } from '../ai/ai.module'
import { TranslationModule } from '../translation/translation.module'
import { TtsModule } from '../tts/tts.module'
import {
  QUEUE_AI,
  QUEUE_DIGEST,
  QUEUE_SOCIAL,
  QUEUE_TRANSLATE,
  QUEUE_TTS,
} from './queue.constants'
import { JobsService } from './jobs.service'
import { TranslateProcessor } from './translate.processor'
import { TtsProcessor } from './tts.processor'
import { EmbedProcessor } from './embed.processor'

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.getOrThrow<string>('REDIS_HOST'),
          port: config.getOrThrow<number>('REDIS_PORT'),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          maxRetriesPerRequest: null,
        },
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 100,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_TRANSLATE },
      { name: QUEUE_AI },
      { name: QUEUE_TTS },
      { name: QUEUE_SOCIAL },
      { name: QUEUE_DIGEST },
    ),
    TranslationModule,
    TtsModule,
    AiModule,
  ],
  providers: [JobsService, TranslateProcessor, TtsProcessor, EmbedProcessor],
  exports: [JobsService, BullModule],
})
export class JobsModule {}
