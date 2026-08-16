import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { Job } from 'bullmq'
import { ArticlesService } from '../articles/articles.service'
import { QUEUE_PUBLISH } from './queue.constants'

@Processor(QUEUE_PUBLISH)
export class PublishProcessor extends WorkerHost {
  private readonly logger = new Logger(PublishProcessor.name)

  constructor(private readonly articles: ArticlesService) {
    super()
  }

  async process(job: Job): Promise<void> {
    const result = await this.articles.publishDueScheduled()
    if (result.published > 0) {
      this.logger.log(
        `Publish job ${job.id}: ${result.published} scheduled stor${
          result.published === 1 ? 'y' : 'ies'
        } went live`,
      )
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(
      `Publish job ${job?.id ?? 'unknown'} failed: ${error.message}`,
    )
  }
}
