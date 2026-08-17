import { InjectQueue } from '@nestjs/bullmq'
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MediaKind, NarrationStatus } from '@prisma/client'
import { Queue } from 'bullmq'
import { TextToSpeechClient } from '@google-cloud/text-to-speech'
import { resolveGoogleClientAuth, type GoogleClientAuth } from '../config/google-credentials'
import { QUEUE_TTS } from '../jobs/queue.constants'
import { PrismaService } from '../prisma/prisma.service'
import { StorageService } from '../storage/storage.service'
import type { StoredArticleBlock } from '../articles/article.types'

const MAX_CHARS = 4500

export type TtsJobData = {
  articleId: string
}

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name)
  private readonly enabled: boolean
  private readonly voiceName: string
  private readonly languageCode: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
    @InjectQueue(QUEUE_TTS) private readonly ttsQueue: Queue,
  ) {
    const flag = this.config.get<string>('FEATURE_TTS')
    this.enabled = flag === undefined || flag === '' || flag === 'true'
    this.languageCode =
      this.config.get<string>('TTS_LANGUAGE_CODE') || 'bg-BG'
    this.voiceName =
      this.config.get<string>('TTS_VOICE_NAME') || 'bg-BG-Standard-A'
  }

  async enqueue(articleId: string) {
    if (!this.enabled) {
      throw new ServiceUnavailableException('TTS narration is disabled')
    }
    const credentials = this.resolveGoogleAuth()
    if (!credentials) {
      throw new ServiceUnavailableException(
        'Google Cloud TTS credentials missing. Set GOOGLE_SERVICE_ACCOUNT_JSON to the service-account JSON, or GOOGLE_APPLICATION_CREDENTIALS to a file path.',
      )
    }

    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, titleBg: true, body: true },
    })
    if (!article) throw new NotFoundException('Article not found')

    const script = this.buildScript(article.titleBg, article.body)
    if (!script.trim()) {
      throw new BadRequestException(
        'Article has no Bulgarian text to narrate',
      )
    }

    await this.prisma.article.update({
      where: { id: articleId },
      data: {
        narrationStatus: NarrationStatus.PENDING,
        narrationError: null,
      },
    })

    await this.ttsQueue.add(
      'narrate',
      { articleId } satisfies TtsJobData,
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    )

    this.logger.log(`Queued TTS narration for ${articleId}`)
    return { ok: true, queued: true }
  }

  async processArticle(articleId: string): Promise<void> {
    await this.prisma.article.update({
      where: { id: articleId },
      data: {
        narrationStatus: NarrationStatus.RUNNING,
        narrationError: null,
      },
    })

    try {
      const article = await this.prisma.article.findUniqueOrThrow({
        where: { id: articleId },
        select: {
          id: true,
          titleBg: true,
          body: true,
          audioMediaId: true,
          slug: true,
        },
      })

      const script = this.buildScript(article.titleBg, article.body)
      if (!script.trim()) {
        throw new Error('No text available for narration')
      }

      const auth = this.resolveGoogleAuth()
      if (!auth) {
        throw new Error(
          'Google credentials missing for TTS (set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS)',
        )
      }

      const clipped = script.slice(0, MAX_CHARS)
      const client = this.createTtsClient(auth)
      const [response] = await client.synthesizeSpeech({
        input: { text: clipped },
        voice: {
          languageCode: this.languageCode,
          name: this.voiceName,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 0.95,
        },
      })

      const audioContent = response.audioContent
      if (!audioContent) {
        throw new Error('TTS returned empty audio')
      }

      const buffer = Buffer.from(audioContent as Uint8Array)
      const uploaded = await this.storage.uploadBuffer({
        buffer,
        mimeType: 'audio/mpeg',
        originalName: `${article.slug || article.id}-narration.mp3`,
        folder: 'narration',
      })

      const media = await this.prisma.mediaAsset.create({
        data: {
          key: uploaded.key,
          url: uploaded.url,
          mimeType: uploaded.mimeType,
          kind: MediaKind.AUDIO,
          originalName: uploaded.originalName,
          size: uploaded.size,
          titleBg: `Narration: ${article.titleBg}`.slice(0, 200),
          creditBg: 'Prizni TTS',
        },
      })

      const previousAudioId = article.audioMediaId

      await this.prisma.article.update({
        where: { id: articleId },
        data: {
          audioMediaId: media.id,
          narrationStatus: NarrationStatus.READY,
          narrationError: null,
        },
      })

      if (previousAudioId && previousAudioId !== media.id) {
        this.logger.log(
          `Replaced audioMediaId on ${articleId} (previous ${previousAudioId})`,
        )
      }

      this.logger.log(
        `TTS narration ready for ${articleId} → media ${media.id}`,
      )
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      await this.markFailed(articleId, message)
      throw error instanceof Error ? error : new Error(message)
    }
  }

  async markFailed(articleId: string, message: string) {
    await this.prisma.article.update({
      where: { id: articleId },
      data: {
        narrationStatus: NarrationStatus.FAILED,
        narrationError: message.slice(0, 2000),
      },
    })
  }

  async clearNarration(articleId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true },
    })
    if (!article) throw new NotFoundException('Article not found')

    await this.prisma.article.update({
      where: { id: articleId },
      data: {
        audioMediaId: null,
        narrationStatus: NarrationStatus.IDLE,
        narrationError: null,
      },
    })
    return { ok: true }
  }

  /**
   * Inline JSON (`GOOGLE_SERVICE_ACCOUNT_JSON`) or a credentials file path.
   */
  resolveGoogleAuth(): GoogleClientAuth | null {
    return resolveGoogleClientAuth((key) => this.config.get<string>(key)?.trim())
  }

  /** @deprecated use resolveGoogleAuth */
  resolveCredentialsPath(): string | null {
    const auth = this.resolveGoogleAuth()
    return auth && 'keyFilename' in auth ? auth.keyFilename : null
  }

  private createTtsClient(auth: GoogleClientAuth): TextToSpeechClient {
    if ('credentials' in auth) {
      this.logger.log('Using Google credentials from GOOGLE_SERVICE_ACCOUNT_JSON')
      return new TextToSpeechClient({
        credentials: auth.credentials,
        projectId: auth.projectId,
      })
    }
    this.logger.log(`Using Google credentials at ${auth.keyFilename}`)
    return new TextToSpeechClient({
      keyFilename: auth.keyFilename,
      projectId: auth.projectId,
    })
  }

  private buildScript(titleBg: string, bodyRaw: unknown): string {
    const parts: string[] = []
    if (titleBg?.trim()) parts.push(titleBg.trim())

    const body = Array.isArray(bodyRaw)
      ? (bodyRaw as StoredArticleBlock[])
      : []
    for (const block of body) {
      if (block.type === 'note') {
        if (block.labelBg?.trim()) parts.push(block.labelBg.trim())
        if (block.textBg?.trim()) parts.push(block.textBg.trim())
      } else if (block.type === 'pullquote' || block.type === 'paragraph') {
        if (block.textBg?.trim()) parts.push(block.textBg.trim())
      } else if (block.type === 'caption') {
        // skip captions for narration
      }
    }
    return parts.join('\n\n')
  }
}
