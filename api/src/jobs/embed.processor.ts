import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { Job } from 'bullmq'
import { AiService } from '../ai/ai.service'
import { QUEUE_AI, type EmbedJobData } from './queue.constants'

@Processor(QUEUE_AI)
export class EmbedProcessor extends WorkerHost {
  private readonly logger = new Logger(EmbedProcessor.name)

  constructor(private readonly ai: AiService) {
    super()
  }

  async process(job: Job<EmbedJobData>): Promise<void> {
    this.logger.log(
      `Embed job ${job.id} attempt ${job.attemptsMade + 1}: ${job.data.articleId}`,
    )
    try {
      await this.ai.processEmbed(job.data.articleId)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`Embed job failed: ${message}`)
      throw error instanceof Error ? error : new Error(message)
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<EmbedJobData> | undefined, error: Error) {
    if (!job?.data?.articleId) return
    const maxAttempts = job.opts.attempts ?? 1
    if (job.attemptsMade < maxAttempts) {
      this.logger.warn(
        `Embed ${job.data.articleId} will retry (${job.attemptsMade}/${maxAttempts}): ${error.message}`,
      )
      return
    }
    this.logger.error(
      `Embed ${job.data.articleId} failed permanently: ${error.message}`,
    )
  }
}
