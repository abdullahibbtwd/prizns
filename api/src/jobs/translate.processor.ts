import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { Job } from 'bullmq'
import { TranslationService } from '../translation/translation.service'
import { QUEUE_TRANSLATE, type TranslateJobData } from './queue.constants'

@Processor(QUEUE_TRANSLATE)
export class TranslateProcessor extends WorkerHost {
  private readonly logger = new Logger(TranslateProcessor.name)

  constructor(private readonly translation: TranslationService) {
    super()
  }

  async process(job: Job<TranslateJobData>): Promise<void> {
    const { type, id } = job.data
    this.logger.log(
      `Translate job ${job.id} attempt ${job.attemptsMade + 1}: ${type} ${id}`,
    )
    if (type === 'article') {
      await this.translation.processArticle(id)
      return
    }
    if (type === 'author') {
      await this.translation.processAuthor(id)
      return
    }
    if (type === 'series') {
      await this.translation.processSeries(id)
      return
    }
    if (type === 'category') {
      await this.translation.processCategory(id)
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<TranslateJobData> | undefined, error: Error) {
    if (!job?.data) return
    const maxAttempts = job.opts.attempts ?? 1
    if (job.attemptsMade < maxAttempts) {
      this.logger.warn(
        `Translate ${job.data.type} ${job.data.id} will retry (${job.attemptsMade}/${maxAttempts}): ${error.message}`,
      )
      return
    }
    this.logger.error(
      `Translate ${job.data.type} ${job.data.id} failed permanently: ${error.message}`,
    )
    await this.translation.markFailed(
      job.data.type,
      job.data.id,
      error.message,
    )
  }
}
