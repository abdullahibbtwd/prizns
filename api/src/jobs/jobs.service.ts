import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import {
  QUEUE_AI,
  QUEUE_DIGEST,
  QUEUE_SOCIAL,
  QUEUE_TRANSLATE,
  QUEUE_TTS,
  type TranslateJobData,
} from './queue.constants'

@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name)

  constructor(
    @InjectQueue(QUEUE_TRANSLATE) private readonly translateQueue: Queue,
    @InjectQueue(QUEUE_AI) private readonly aiQueue: Queue,
    @InjectQueue(QUEUE_TTS) private readonly ttsQueue: Queue,
    @InjectQueue(QUEUE_SOCIAL) private readonly socialQueue: Queue,
    @InjectQueue(QUEUE_DIGEST) private readonly digestQueue: Queue,
  ) {}

  onModuleInit() {
    this.logger.log(
      `BullMQ ready: ${[
        QUEUE_TRANSLATE,
        QUEUE_AI,
        QUEUE_TTS,
        QUEUE_SOCIAL,
        QUEUE_DIGEST,
      ].join(', ')}`,
    )
  }

  enqueueTranslate(data: TranslateJobData) {
    return this.translateQueue.add(`translate:${data.type}`, data, {
      jobId: `translate:${data.type}:${data.id}`,
      removeOnComplete: 100,
      removeOnFail: 200,
      attempts: 3,
      backoff: { type: 'exponential', delay: 4000 },
    })
  }

  /** Health ping — confirms worker path is wired. */
  async pingTranslateQueue(): Promise<{ waiting: number; name: string }> {
    const waiting = await this.translateQueue.getWaitingCount()
    return { waiting, name: QUEUE_TRANSLATE }
  }

  get queues() {
    return {
      translate: this.translateQueue,
      ai: this.aiQueue,
      tts: this.ttsQueue,
      social: this.socialQueue,
      digest: this.digestQueue,
    }
  }
}
