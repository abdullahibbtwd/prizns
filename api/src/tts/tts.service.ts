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
import { chunkParagraphsToSsml } from './tts-chunk'
import { QUEUE_TTS } from '../jobs/queue.constants'
import { PrismaService } from '../prisma/prisma.service'
import { StorageService } from '../storage/storage.service'
import type { StoredArticleBlock } from '../articles/article.types'

export type TtsJobData = {
  articleId: string
}

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name)
  private readonly enabled: boolean
  private readonly voiceName: string
  private readonly languageCode: string
  private readonly speakingRate: number
  private readonly pitch: number

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
    // Chirp3 HD is the natural BG tier available on this project (no Wavenet/Neural2).
    this.voiceName =
      this.config.get<string>('TTS_VOICE_NAME') || 'bg-BG-Chirp3-HD-Leda'
    this.speakingRate = this.readNumber('TTS_SPEAKING_RATE', 0.92, 0.25, 4)
    this.pitch = this.readNumber('TTS_PITCH', -1, -20, 20)
  }

  private readNumber(
    key: string,
    fallback: number,
    min: number,
    max: number,
  ): number {
    const raw = this.config.get<string>(key)
    if (raw === undefined || raw === '') return fallback
    const n = Number(raw)
    if (!Number.isFinite(n)) return fallback
    return Math.min(max, Math.max(min, n))
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

    const script = this.buildParagraphs(article.titleBg, article.body).join(
      '\n\n',
    )
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

      const paragraphs = this.buildParagraphs(article.titleBg, article.body)
      if (paragraphs.length === 0) {
        throw new Error('No text available for narration')
      }

      const auth = this.resolveGoogleAuth()
      if (!auth) {
        throw new Error(
          'Google credentials missing for TTS (set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS)',
        )
      }

      const chunks = chunkParagraphsToSsml(paragraphs)
      const client = this.createTtsClient(auth)
      const parts: Buffer[] = []
      this.logger.log(
        `Synthesizing ${chunks.length} SSML chunk(s) with voice=${this.voiceName} rate=${this.speakingRate} pitch=${this.pitch}`,
      )
      for (const [index, ssml] of chunks.entries()) {
        const audioConfig: {
          audioEncoding: 'MP3'
          speakingRate: number
          pitch?: number
        } = {
          audioEncoding: 'MP3',
          speakingRate: this.speakingRate,
        }
        // Chirp3 HD rejects pitch; only set it for Standard/Wavenet/Neural voices.
        if (!this.voiceName.includes('Chirp') && this.pitch !== 0) {
          audioConfig.pitch = this.pitch
        }
        const [response] = await client.synthesizeSpeech({
          input: { ssml },
          voice: {
            languageCode: this.languageCode,
            name: this.voiceName,
          },
          audioConfig,
        })
        const audioContent = response.audioContent
        if (!audioContent) {
          throw new Error(`TTS returned empty audio for chunk ${index + 1}/${chunks.length}`)
        }
        parts.push(Buffer.from(audioContent as Uint8Array))
      }

      const buffer = Buffer.concat(parts)
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
        `TTS narration ready for ${articleId} → media ${media.id} (${chunks.length} chunk${chunks.length === 1 ? '' : 's'})`,
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

  private stripRichText(value: string): string {
    return value
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private buildParagraphs(titleBg: string, bodyRaw: unknown): string[] {
    const parts: string[] = []
    if (titleBg?.trim()) parts.push(titleBg.trim())

    const body = Array.isArray(bodyRaw)
      ? (bodyRaw as StoredArticleBlock[])
      : []
    for (const block of body) {
      if (block.type === 'note') {
        if (block.labelBg?.trim()) parts.push(block.labelBg.trim())
        const note = this.stripRichText(block.textBg ?? '')
        if (note) parts.push(note)
      } else if (block.type === 'pullquote' || block.type === 'paragraph') {
        const text = this.stripRichText(block.textBg ?? '')
        if (text) parts.push(text)
      } else if (block.type === 'caption') {
        // skip captions for narration
      }
    }
    return parts
  }
}
