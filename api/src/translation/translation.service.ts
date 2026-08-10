import { InjectQueue } from '@nestjs/bullmq'
import { Injectable, Logger } from '@nestjs/common'
import { type Article, type Prisma, TranslationStatus } from '@prisma/client'
import { Queue } from 'bullmq'
import { translate } from 'google-translate-api-x'
import type { StoredArticleBlock } from '../articles/article.types'
import {
  QUEUE_TRANSLATE,
  type TranslateJobData,
} from '../jobs/queue.constants'
import { PrismaService } from '../prisma/prisma.service'

const CHUNK_SIZE = 25
const CHUNK_DELAY_MS = 700

type Lang = 'bg' | 'en'

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name)

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_TRANSLATE) private readonly translateQueue: Queue,
  ) {
    this.logger.log(
      'Translation service ready (google-translate-api-x + BullMQ)',
    )
  }

  async enqueue(articleId: string): Promise<void> {
    await this.prisma.article.update({
      where: { id: articleId },
      data: {
        translationStatus: TranslationStatus.PENDING,
        translationError: null,
      },
    })
    await this.addJob({ type: 'article', id: articleId })
    this.logger.log(`Queued article translation for ${articleId}`)
  }

  async enqueueAuthor(authorId: string): Promise<void> {
    await this.prisma.author.update({
      where: { id: authorId },
      data: {
        translationStatus: TranslationStatus.PENDING,
        translationError: null,
      },
    })
    await this.addJob({ type: 'author', id: authorId })
    this.logger.log(`Queued author translation for ${authorId}`)
  }

  async enqueueSeries(seriesId: string): Promise<void> {
    await this.prisma.series.update({
      where: { id: seriesId },
      data: {
        translationStatus: TranslationStatus.PENDING,
        translationError: null,
      },
    })
    await this.addJob({ type: 'series', id: seriesId })
    this.logger.log(`Queued series translation for ${seriesId}`)
  }

  /**
   * Detect language of a single editor string and return bilingual pair.
   * Used for short entities (tags) that are not queued like articles.
   */
  async bilingualFromSingle(
    text: string,
  ): Promise<{ bg: string; en: string }> {
    const original = text.trim()
    if (!original) return { bg: '', en: '' }
    const sourceLang = this.detectSourceLang([original])
    const targetLang: Lang = sourceLang === 'bg' ? 'en' : 'bg'
    const map = await this.translateMany([original], sourceLang, targetLang)
    return this.pair(map, original, sourceLang)
  }

  async markFailed(
    type: TranslateJobData['type'],
    id: string,
    message: string,
  ): Promise<void> {
    const data = {
      translationStatus: TranslationStatus.FAILED,
      translationError: message.slice(0, 2000),
    }
    if (type === 'article') {
      await this.prisma.article.update({ where: { id }, data })
      return
    }
    if (type === 'author') {
      await this.prisma.author.update({ where: { id }, data })
      return
    }
    await this.prisma.series.update({ where: { id }, data })
  }

  async processArticle(articleId: string): Promise<void> {
    await this.prisma.article.update({
      where: { id: articleId },
      data: {
        translationStatus: TranslationStatus.RUNNING,
        translationError: null,
      },
    })

    const article: Article = await this.prisma.article.findUniqueOrThrow({
      where: { id: articleId },
    })
    const body = this.parseBody(article.body)

    const sources: string[] = [
      article.categoryBg,
      article.titleBg,
      article.subtitleBg,
      article.readTimeBg,
      article.locationBg,
      article.dateBg,
      article.photoCreditBg,
      article.endLabelBg,
      article.speakerBg ?? '',
      article.behindStoryBg ?? '',
      article.seoTitleBg ?? '',
      article.seoDescriptionBg ?? '',
      ...this.collectFromBody(body),
    ]

    const sourceLang = this.detectSourceLang([
      article.titleBg,
      article.subtitleBg,
      ...this.collectFromBody(body).slice(0, 3),
    ])
    const targetLang: Lang = sourceLang === 'bg' ? 'en' : 'bg'
    this.logger.log(
      `Article ${articleId}: detected ${sourceLang} → translating to ${targetLang}`,
    )

    const map = await this.translateMany(sources, sourceLang, targetLang)
    const translatedBody = this.translateBody(body, map, sourceLang)

    const category = this.pair(map, article.categoryBg, sourceLang)
    const title = this.pair(map, article.titleBg, sourceLang)
    const subtitle = this.pair(map, article.subtitleBg, sourceLang)
    const readTime = this.pair(map, article.readTimeBg, sourceLang)
    const location = this.pair(map, article.locationBg, sourceLang)
    const date = this.pair(map, article.dateBg, sourceLang)
    const photoCredit = this.pair(map, article.photoCreditBg, sourceLang)
    const endLabel = this.pair(map, article.endLabelBg, sourceLang)
    const speaker = article.speakerBg
      ? this.pair(map, article.speakerBg, sourceLang)
      : null
    const behindStory = article.behindStoryBg?.trim()
      ? this.pair(map, article.behindStoryBg, sourceLang)
      : null
    const seoTitle = article.seoTitleBg?.trim()
      ? this.pair(map, article.seoTitleBg, sourceLang)
      : null
    const seoDescription = article.seoDescriptionBg?.trim()
      ? this.pair(map, article.seoDescriptionBg, sourceLang)
      : null

    const latest = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { translationStatus: true },
    })
    if (latest?.translationStatus !== TranslationStatus.RUNNING) {
      this.logger.warn(`Skip stale article translation write for ${articleId}`)
      return
    }

    await this.prisma.article.update({
      where: { id: articleId },
      data: {
        translationStatus: TranslationStatus.READY,
        translationError: null,
        sourceLang,
        categoryBg: category.bg,
        categoryEn: category.en,
        titleBg: title.bg,
        titleEn: title.en,
        subtitleBg: subtitle.bg,
        subtitleEn: subtitle.en,
        readTimeBg: readTime.bg,
        readTimeEn: readTime.en,
        locationBg: location.bg,
        locationEn: location.en,
        dateBg: date.bg,
        dateEn: date.en,
        photoCreditBg: photoCredit.bg,
        photoCreditEn: photoCredit.en,
        endLabelBg: endLabel.bg,
        endLabelEn: endLabel.en,
        speakerBg: speaker?.bg || null,
        speakerEn: speaker?.en || null,
        behindStoryBg: behindStory?.bg ?? article.behindStoryBg,
        behindStoryEn: behindStory?.en || null,
        seoTitleBg: seoTitle?.bg || article.seoTitleBg,
        seoTitleEn: seoTitle?.en || null,
        seoDescriptionBg: seoDescription?.bg || article.seoDescriptionBg,
        seoDescriptionEn: seoDescription?.en || null,
        body: translatedBody,
      },
    })
    this.logger.log(
      `Translated article ${articleId} (${sourceLang}→${targetLang})`,
    )
  }

  async processAuthor(authorId: string): Promise<void> {
    await this.prisma.author.update({
      where: { id: authorId },
      data: {
        translationStatus: TranslationStatus.RUNNING,
        translationError: null,
      },
    })

    const author = await this.prisma.author.findUniqueOrThrow({
      where: { id: authorId },
    })

    const sources = [
      author.nameBg,
      author.roleBg,
      author.locationBg ?? '',
      author.quoteBg ?? '',
      author.bioBg ?? '',
    ]
    const sourceLang = this.detectSourceLang(sources)
    const targetLang: Lang = sourceLang === 'bg' ? 'en' : 'bg'
    this.logger.log(
      `Author ${authorId}: detected ${sourceLang} → translating to ${targetLang}`,
    )

    const map = await this.translateMany(sources, sourceLang, targetLang)

    const name = this.pair(map, author.nameBg, sourceLang)
    const role = this.pair(map, author.roleBg, sourceLang)
    const location = author.locationBg
      ? this.pair(map, author.locationBg, sourceLang)
      : null
    const quote = author.quoteBg
      ? this.pair(map, author.quoteBg, sourceLang)
      : null
    const bio = author.bioBg
      ? this.pair(map, author.bioBg, sourceLang)
      : null

    const latest = await this.prisma.author.findUnique({
      where: { id: authorId },
      select: { translationStatus: true },
    })
    if (latest?.translationStatus !== TranslationStatus.RUNNING) {
      this.logger.warn(`Skip stale author translation write for ${authorId}`)
      return
    }

    await this.prisma.author.update({
      where: { id: authorId },
      data: {
        translationStatus: TranslationStatus.READY,
        translationError: null,
        sourceLang,
        nameBg: name.bg,
        nameEn: name.en || null,
        roleBg: role.bg,
        roleEn: role.en || null,
        locationBg: location?.bg || null,
        locationEn: location?.en || null,
        quoteBg: quote?.bg || null,
        quoteEn: quote?.en || null,
        bioBg: bio?.bg || null,
        bioEn: bio?.en || null,
      },
    })
    this.logger.log(
      `Translated author ${authorId} (${sourceLang}→${targetLang})`,
    )
  }

  async processSeries(seriesId: string): Promise<void> {
    await this.prisma.series.update({
      where: { id: seriesId },
      data: {
        translationStatus: TranslationStatus.RUNNING,
        translationError: null,
      },
    })

    const series = await this.prisma.series.findUniqueOrThrow({
      where: { id: seriesId },
    })

    const sources = [series.titleBg, series.descriptionBg]
    const sourceLang = this.detectSourceLang(sources)
    const targetLang: Lang = sourceLang === 'bg' ? 'en' : 'bg'
    this.logger.log(
      `Series ${seriesId}: detected ${sourceLang} → translating to ${targetLang}`,
    )

    const map = await this.translateMany(sources, sourceLang, targetLang)
    const title = this.pair(map, series.titleBg, sourceLang)
    const description = series.descriptionBg
      ? this.pair(map, series.descriptionBg, sourceLang)
      : null

    const latest = await this.prisma.series.findUnique({
      where: { id: seriesId },
      select: { translationStatus: true },
    })
    if (latest?.translationStatus !== TranslationStatus.RUNNING) {
      this.logger.warn(`Skip stale series translation write for ${seriesId}`)
      return
    }

    await this.prisma.series.update({
      where: { id: seriesId },
      data: {
        translationStatus: TranslationStatus.READY,
        translationError: null,
        sourceLang,
        titleBg: title.bg,
        titleEn: title.en || null,
        descriptionBg: description?.bg ?? series.descriptionBg,
        descriptionEn: description?.en || null,
      },
    })
    this.logger.log(
      `Translated series ${seriesId} (${sourceLang}→${targetLang})`,
    )
  }

  private async addJob(data: TranslateJobData) {
    await this.translateQueue.add(`translate:${data.type}`, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 4000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    })
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /** Detect whether editor text is primarily Bulgarian or English. */
  private detectSourceLang(texts: string[]): Lang {
    const sample = texts
      .map((t) => t?.trim() ?? '')
      .filter(Boolean)
      .join(' ')
      .slice(0, 4000)
    if (!sample) return 'bg'

    const cyrillic = (sample.match(/\p{Script=Cyrillic}/gu) ?? []).length
    const latin = (sample.match(/[A-Za-z]/g) ?? []).length

    if (cyrillic === 0 && latin === 0) return 'bg'
    if (cyrillic > 0 && cyrillic >= latin * 0.35) return 'bg'
    if (latin > cyrillic) return 'en'
    return 'bg'
  }

  private async translateMany(
    texts: string[],
    from: Lang,
    to: Lang,
  ): Promise<Map<string, string>> {
    const unique = [...new Set(texts.map((t) => t.trim()).filter(Boolean))]
    const map = new Map<string, string>()
    if (unique.length === 0) return map

    for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
      const chunk = unique.slice(i, i + CHUNK_SIZE)
      const payload: Record<string, string> = {}
      chunk.forEach((text, index) => {
        payload[`k${index}`] = text
      })

      let attempts = 0
      while (attempts < 4) {
        try {
          const result = await translate(payload, {
            from,
            to,
            forceBatch: true,
            forceFrom: true,
            forceTo: true,
          })

          chunk.forEach((text, index) => {
            const key = `k${index}`
            const item = (result as Record<string, unknown>)[key]
            const translated =
              typeof item === 'string'
                ? item
                : item && typeof item === 'object' && 'text' in item
                  ? String((item as { text: unknown }).text)
                  : text
            map.set(text, translated)
          })
          break
        } catch (error: unknown) {
          attempts += 1
          const wait = CHUNK_DELAY_MS * attempts * 2
          this.logger.warn(
            `Translate batch failed ${from}→${to} (attempt ${attempts}), waiting ${wait}ms`,
          )
          await this.sleep(wait)
          if (attempts >= 4) throw error
        }
      }

      if (i + CHUNK_SIZE < unique.length) {
        await this.sleep(CHUNK_DELAY_MS)
      }
    }

    return map
  }

  private tr(map: Map<string, string>, text: string | null | undefined): string {
    const value = text?.trim() ?? ''
    if (!value) return ''
    return map.get(value) ?? value
  }

  private pair(
    map: Map<string, string>,
    original: string,
    sourceLang: Lang,
  ): { bg: string; en: string } {
    const translated = this.tr(map, original)
    if (sourceLang === 'bg') {
      return { bg: original, en: translated }
    }
    return { bg: translated, en: original }
  }

  private parseBody(raw: Prisma.JsonValue): StoredArticleBlock[] {
    if (!Array.isArray(raw)) return []
    return raw as StoredArticleBlock[]
  }

  private collectFromBody(body: StoredArticleBlock[]): string[] {
    const out: string[] = []
    for (const block of body) {
      if (block.type === 'note') {
        if (block.labelBg) out.push(block.labelBg)
        if (block.textBg) out.push(block.textBg)
      } else if (block.textBg) {
        out.push(block.textBg)
      }
    }
    return out
  }

  private translateBody(
    body: StoredArticleBlock[],
    map: Map<string, string>,
    sourceLang: Lang,
  ): StoredArticleBlock[] {
    return body.map((block) => {
      if (block.type === 'note') {
        const label = this.pair(map, block.labelBg, sourceLang)
        const text = this.pair(map, block.textBg, sourceLang)
        return {
          ...block,
          labelBg: label.bg,
          labelEn: label.en,
          textBg: text.bg,
          textEn: text.en,
        }
      }
      const text = this.pair(map, block.textBg, sourceLang)
      return {
        ...block,
        textBg: text.bg,
        textEn: text.en,
      }
    })
  }
}
