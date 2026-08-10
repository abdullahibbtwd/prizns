import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { Job } from 'bullmq'
import { QUEUE_TTS } from '../jobs/queue.constants'
import { TtsService, type TtsJobData } from '../tts/tts.service'

@Processor(QUEUE_TTS)
export class TtsProcessor extends WorkerHost {
  private readonly logger = new Logger(TtsProcessor.name)

  constructor(private readonly tts: TtsService) {
    super()
  }

  async process(job: Job<TtsJobData>): Promise<void> {
    this.logger.log(
      `TTS job ${job.id} attempt ${job.attemptsMade + 1}: ${job.data.articleId}`,
    )
    try {
      await this.tts.processArticle(job.data.articleId)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`TTS job failed: ${message}`)
      throw error instanceof Error ? error : new Error(message)
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<TtsJobData> | undefined, error: Error) {
    if (!job?.data?.articleId) return
    const maxAttempts = job.opts.attempts ?? 1
    if (job.attemptsMade < maxAttempts) {
      this.logger.warn(
        `TTS ${job.data.articleId} will retry (${job.attemptsMade}/${maxAttempts}): ${error.message}`,
      )
      return
    }
    this.logger.error(
      `TTS ${job.data.articleId} failed permanently: ${error.message}`,
    )
    await this.tts.markFailed(job.data.articleId, error.message)
  }
}
