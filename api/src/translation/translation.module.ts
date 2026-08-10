import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { QUEUE_TRANSLATE } from '../jobs/queue.constants'
import { TranslationService } from './translation.service'

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_TRANSLATE })],
  providers: [TranslationService],
  exports: [TranslationService],
})
export class TranslationModule {}
