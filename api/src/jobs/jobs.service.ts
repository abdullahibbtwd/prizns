import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import {
  QUEUE_AI,
  QUEUE_DIGEST,
  QUEUE_PUBLISH,
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
    @InjectQueue(QUEUE_PUBLISH) private readonly publishQueue: Queue,
  ) {}

  async onModuleInit() {
    this.logger.log(
      `BullMQ ready: ${[
        QUEUE_TRANSLATE,
        QUEUE_AI,
        QUEUE_TTS,
        QUEUE_SOCIAL,
        QUEUE_DIGEST,
        QUEUE_PUBLISH,
      ].join(', ')}`,
    )
    await this.ensureDailyDigestScheduler()
    await this.ensurePublishScheduler()
  }

  private async ensureDailyDigestScheduler() {
    try {
      await this.digestQueue.upsertJobScheduler(
        'digest-daily',
        { pattern: '0 8 * * *', tz: 'Europe/Sofia' },
        {
          name: 'daily',
          data: {},
          opts: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 60_000 },
            removeOnComplete: 50,
            removeOnFail: 100,
          },
        },
      )
      this.logger.log('Episode of the Day scheduler: 08:00 Europe/Sofia')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`Could not register digest scheduler: ${message}`)
    }
  }

  private async ensurePublishScheduler() {
    try {
      await this.publishQueue.upsertJobScheduler(
        'publish-due',
        { pattern: '* * * * *' },
        {
          name: 'due',
          data: {},
          opts: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 15_000 },
            removeOnComplete: 50,
            removeOnFail: 100,
          },
        },
      )
      this.logger.log('Scheduled publish checker: every minute')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`Could not register publish scheduler: ${message}`)
    }
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
      publish: this.publishQueue,
    }
  }
}
