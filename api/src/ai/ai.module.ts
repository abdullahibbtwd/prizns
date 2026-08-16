import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { AuthModule } from '../auth/auth.module'
import { QUEUE_AI } from '../jobs/queue.constants'
import { AiController } from './ai.controller'
import { AiService } from './ai.service'
import { ArchiveController } from './archive.controller'
import { PublicAiController } from './public-ai.controller'

@Module({
  imports: [AuthModule, BullModule.registerQueue({ name: QUEUE_AI })],
  controllers: [AiController, PublicAiController, ArchiveController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
