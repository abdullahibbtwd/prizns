import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { QUEUE_TTS } from '../jobs/queue.constants'
import { StorageModule } from '../storage/storage.module'
import { TtsService } from './tts.service'

@Module({
  imports: [StorageModule, BullModule.registerQueue({ name: QUEUE_TTS })],
  providers: [TtsService],
  exports: [TtsService],
})
export class TtsModule {}
