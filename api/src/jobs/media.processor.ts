import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { Job } from 'bullmq'
import { QUEUE_MEDIA, type MediaJobData } from './queue.constants'
import { MediaService } from '../media/media.service'

@Processor(QUEUE_MEDIA)
export class MediaProcessor extends WorkerHost {
  private readonly logger = new Logger(MediaProcessor.name)

  constructor(private readonly media: MediaService) {
    super()
  }

  async process(job: Job<MediaJobData>): Promise<void> {
    this.logger.log(
      `Media job ${job.id} attempt ${job.attemptsMade + 1}: ${job.data.mediaId}`,
    )
    try {
      await this.media.processJob(job.data)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`Media job failed: ${message}`)
      throw error instanceof Error ? error : new Error(message)
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<MediaJobData> | undefined, error: Error) {
    if (!job?.data?.mediaId) return
    const maxAttempts = job.opts.attempts ?? 1
    if (job.attemptsMade < maxAttempts) {
      this.logger.warn(
        `Media ${job.data.mediaId} will retry (${job.attemptsMade}/${maxAttempts}): ${error.message}`,
      )
      return
    }
    this.logger.error(
      `Media ${job.data.mediaId} failed permanently: ${error.message}`,
    )
    await this.media.markFailed(job.data.mediaId, error.message)
  }
}
