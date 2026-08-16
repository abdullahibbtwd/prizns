import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { Job } from 'bullmq'
import { DigestService } from '../digest/digest.service'
import { QUEUE_DIGEST } from './queue.constants'

@Processor(QUEUE_DIGEST)
export class DigestProcessor extends WorkerHost {
  private readonly logger = new Logger(DigestProcessor.name)

  constructor(private readonly digest: DigestService) {
    super()
  }

  async process(job: Job): Promise<void> {
    this.logger.log(
      `Digest job ${job.id} attempt ${job.attemptsMade + 1}: ${job.name}`,
    )
    const result = await this.digest.sendDaily()
    if (result.status === 'skipped') {
      this.logger.log(`Daily digest skipped (${result.reason})`)
      return
    }
    this.logger.log(
      `Daily digest sent article ${result.articleId} → ${result.recipientCount} subscribers`,
    )
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(
      `Digest job ${job?.id ?? 'unknown'} failed: ${error.message}`,
    )
  }
}
