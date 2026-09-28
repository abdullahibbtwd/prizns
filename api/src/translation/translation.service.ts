import { InjectQueue } from '@nestjs/bullmq'
import { Injectable, Logger } from '@nestjs/common'
import {
  type Article,
  type Author,
  type Category,
  type Prisma,
  type Series,
  TranslationStatus,
} from '@prisma/client'
import { Queue } from 'bullmq'
import { translate } from 'google-translate-api-x'
import type { StoredArticleBlock } from '../articles/article.types'
import {
  QUEUE_TRANSLATE,
  type TranslateEntity,
  type TranslateJobData,
} from '../jobs/queue.constants'
import { PrismaService } from '../prisma/prisma.service'
import { translationLooksReady } from '../common/translation-quality'
import { transliterateBg } from '../common/slug.util'

const CHUNK_SIZE = 25
const CHUNK_DELAY_MS = 700
/** Rows saved as PENDING more recently than this are assumed to have a live job. */
const SWEEP_PENDING_GRACE_MS = 2 * 60_000
const SWEEP_BATCH = 20

type Lang = 'bg' | 'en'

const CYRILLIC_RE = /\p{Script=Cyrillic}/u

/**
 * Bulgarian is the editorial source of truth. Translation jobs only ever fill
 * the `*En` columns — they never rewrite what an editor typed into `*Bg`, and
 * they preserve `updatedAt` so "last edited" reflects human edits only.
 */
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

  async enqueueCategory(categoryId: string): Promise<void> {
    await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        translationStatus: TranslationStatus.PENDING,
        translationError: null,
      },
    })
    await this.addJob({ type: 'category', id: categoryId })
    this.logger.log(`Queued category translation for ${categoryId}`)
  }

  /**
   * Detect language of a single editor string and return bilingual pair.
   * Used for short entities (tags) that are not queued like articles.
   * Place names are transliterated, never translated ("Лом" → "Lom", not "Scrap").
   */
  async bilingualFromSingle(
    text: string,
    opts: { place?: boolean } = {},
  ): Promise<{ bg: string; en: string }> {
    const original = text.trim()
    if (!original) return { bg: '', en: '' }
    if (opts.place && this.hasCyrillic(original)) {
      return { bg: original, en: transliterateName(original) }
    }
    const sourceLang = this.detectSourceLang([original])
    const targetLang: Lang = sourceLang === 'bg' ? 'en' : 'bg'
    const map = await this.translateMany([original], sourceLang, targetLang)
    const translated = this.tr(map, original)
    return sourceLang === 'bg'
      ? { bg: original, en: translated }
      : { bg: translated, en: original }
  }

  async markFailed(
    type: TranslateEntity,
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
    if (type === 'series') {
      await this.prisma.series.update({ where: { id }, data })
      return
    }
    await this.prisma.category.update({ where: { id }, data })
  }

  /**
   * Re-queue rows whose job was lost (WordPress import, Redis restart, worker
   * crash). Only runs when the queue is otherwise idle so live jobs are never
   * duplicated.
   */
  async sweepStale(now = new Date()): Promise<number> {
    const counts = await this.translateQueue.getJobCounts(
      'waiting',
      'delayed',
      'active',
    )
    if ((counts.waiting ?? 0) + (counts.delayed ?? 0) > 0) return 0
    if ((counts.active ?? 0) > 1) return 0

    const where = {
      OR: [
        {
          translationStatus: TranslationStatus.PENDING,
          updatedAt: { lt: new Date(now.getTime() - SWEEP_PENDING_GRACE_MS) },
        },
        { translationStatus: TranslationStatus.RUNNING },
      ],
    }
    const query = {
      where,
      select: { id: true },
      orderBy: { updatedAt: 'desc' as const },
      take: SWEEP_BATCH,
    }
    const authors = await this.prisma.author.findMany(query)
    const categories = await this.prisma.category.findMany(query)
    const series = await this.prisma.series.findMany(query)
    const articles = await this.prisma.article.findMany(query)
    const jobs: TranslateJobData[] = [
      ...authors.map((row) => ({ type: 'author' as const, id: row.id })),
      ...categories.map((row) => ({ type: 'category' as const, id: row.id })),
      ...series.map((row) => ({ type: 'series' as const, id: row.id })),
      ...articles.map((row) => ({ type: 'article' as const, id: row.id })),
    ]
    for (const job of jobs) {
      await this.addJob(job)
    }
    if (jobs.length > 0) {
      this.logger.log(`Translation sweep re-queued ${jobs.length} stuck row(s)`)
    }
    return jobs.length
  }

  async processArticle(articleId: string): Promise<void> {
    const article = await this.startRun('article', articleId)
    if (!article) return

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
    this.logger.log(`Article ${articleId}: translating Bulgarian fields → en`)

    const map = await this.englishMap(sources)
    const en = (value: string | null | undefined) => this.en(map, value)
    const optionalEn = (value: string | null | undefined) =>
      value?.trim() ? en(value) : null

    const titleEn = en(article.titleBg)
    const ready = this.englishReady(article.titleBg, titleEn)
    const { count } = await this.prisma.article.updateMany({
      where: this.runGuard(articleId, article.updatedAt),
      data: {
        ...this.result(ready),
        sourceLang,
        updatedAt: article.updatedAt,
        categoryEn: en(article.categoryBg),
        titleEn,
        subtitleEn: en(article.subtitleBg),
        readTimeEn: en(article.readTimeBg),
        locationEn: en(article.locationBg),
        dateEn: en(article.dateBg),
        photoCreditEn: en(article.photoCreditBg),
        endLabelEn: en(article.endLabelBg),
        speakerEn: optionalEn(article.speakerBg),
        behindStoryEn: optionalEn(article.behindStoryBg),
        seoTitleEn: optionalEn(article.seoTitleBg),
        seoDescriptionEn: optionalEn(article.seoDescriptionBg),
        body: this.translateBody(body, map) as unknown as Prisma.InputJsonValue,
      },
    })
    await this.finishRun('article', articleId, count, ready)
  }

  async processAuthor(authorId: string): Promise<void> {
    const author = await this.startRun('author', authorId)
    if (!author) return

    const sources = [
      author.nameBg,
      author.roleBg,
      author.locationBg ?? '',
      author.quoteBg ?? '',
      author.bioBg ?? '',
    ]
    const map = await this.englishMap(sources)
    const optionalEn = (value: string | null | undefined) =>
      value?.trim() ? this.en(map, value) || null : null

    const nameEn = this.en(map, author.nameBg)
    const ready = this.englishReady(author.nameBg, nameEn)
    const { count } = await this.prisma.author.updateMany({
      where: this.runGuard(authorId, author.updatedAt),
      data: {
        ...this.result(ready),
        sourceLang: this.detectSourceLang(sources),
        updatedAt: author.updatedAt,
        nameEn: nameEn || null,
        roleEn: optionalEn(author.roleBg),
        locationEn: optionalEn(author.locationBg),
        quoteEn: optionalEn(author.quoteBg),
        bioEn: optionalEn(author.bioBg),
      },
    })
    await this.finishRun('author', authorId, count, ready)
  }

  async processSeries(seriesId: string): Promise<void> {
    const series = await this.startRun('series', seriesId)
    if (!series) return

    const sources = [series.titleBg, series.descriptionBg ?? '']
    const map = await this.englishMap(sources)
    const titleEn = this.en(map, series.titleBg)
    const ready = this.englishReady(series.titleBg, titleEn)
    const { count } = await this.prisma.series.updateMany({
      where: this.runGuard(seriesId, series.updatedAt),
      data: {
        ...this.result(ready),
        sourceLang: this.detectSourceLang(sources),
        updatedAt: series.updatedAt,
        titleEn: titleEn || null,
        descriptionEn: series.descriptionBg?.trim()
          ? this.en(map, series.descriptionBg) || null
          : null,
      },
    })
    await this.finishRun('series', seriesId, count, ready)
  }

  async processCategory(categoryId: string): Promise<void> {
    const category = await this.startRun('category', categoryId)
    if (!category) return

    const sources = [category.nameBg, category.descriptionBg ?? '']
    const map = await this.englishMap(sources)
    const nameEn = this.en(map, category.nameBg)
    const ready = this.englishReady(category.nameBg, nameEn)
    const { count } = await this.prisma.category.updateMany({
      where: this.runGuard(categoryId, category.updatedAt),
      data: {
        ...this.result(ready),
        sourceLang: this.detectSourceLang(sources),
        updatedAt: category.updatedAt,
        nameEn: nameEn || null,
        descriptionEn: category.descriptionBg?.trim()
          ? this.en(map, category.descriptionBg) || null
          : null,
      },
    })
    await this.finishRun('category', categoryId, count, ready)
  }

  private startRun(type: 'article', id: string): Promise<Article | null>
  private startRun(type: 'author', id: string): Promise<Author | null>
  private startRun(type: 'series', id: string): Promise<Series | null>
  private startRun(type: 'category', id: string): Promise<Category | null>
  /**
   * Snapshot the row and flip it to RUNNING without touching `updatedAt`.
   * Returns null when the row changed between the read and the flip — the
   * editor's save already queued a fresh job (or the sweep will).
   */
  private async startRun(
    type: TranslateEntity,
    id: string,
  ): Promise<{ updatedAt: Date } | null> {
    const delegate = this.delegate(type)
    const row = (await delegate.findUniqueOrThrow({ where: { id } })) as {
      updatedAt: Date
    }
    const { count } = await delegate.updateMany({
      where: { id, updatedAt: row.updatedAt },
      data: {
        translationStatus: TranslationStatus.RUNNING,
        translationError: null,
        updatedAt: row.updatedAt,
      },
    })
    if (count === 0) {
      this.logger.warn(`Skip ${type} ${id}: edited before translation started`)
      return null
    }
    return row
  }

  private runGuard(id: string, updatedAt: Date) {
    return { id, translationStatus: TranslationStatus.RUNNING, updatedAt }
  }

  private result(ready: boolean) {
    return {
      translationStatus: ready
        ? TranslationStatus.READY
        : TranslationStatus.FAILED,
      translationError: ready
        ? null
        : 'English translation matched the Bulgarian source (or was empty). Re-run translation.',
    }
  }

  /**
   * A zero-count guarded write means an editor saved mid-translation. Text
   * edits re-queue themselves (status → PENDING); for non-text edits the row
   * is still RUNNING, so hand it back to the queue.
   */
  private async finishRun(
    type: TranslateEntity,
    id: string,
    count: number,
    ready: boolean,
  ): Promise<void> {
    if (count > 0) {
      this.logger.log(
        ready
          ? `Translated ${type} ${id} (bg→en)`
          : `${type} ${id} translation rejected — EN did not differ from BG`,
      )
      return
    }
    const latest = (await this.delegate(type).findUnique({
      where: { id },
      select: { translationStatus: true },
    })) as { translationStatus: TranslationStatus } | null
    if (latest?.translationStatus === TranslationStatus.RUNNING) {
      this.logger.warn(`Re-queue ${type} ${id}: edited during translation`)
      await this.addJob({ type, id })
      return
    }
    this.logger.warn(`Skip stale ${type} translation write for ${id}`)
  }

  private delegate(type: TranslateEntity) {
    const delegates = {
      article: this.prisma.article,
      author: this.prisma.author,
      series: this.prisma.series,
      category: this.prisma.category,
    }
    return delegates[type] as unknown as {
      findUniqueOrThrow(args: { where: { id: string } }): Promise<unknown>
      findUnique(args: {
        where: { id: string }
        select: { translationStatus: true }
      }): Promise<unknown>
      updateMany(args: {
        where: Record<string, unknown>
        data: Record<string, unknown>
      }): Promise<{ count: number }>
    }
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

  private hasCyrillic(text: string | null | undefined): boolean {
    return CYRILLIC_RE.test(text ?? '')
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

  /** Translate only the strings that actually contain Bulgarian. */
  private englishMap(texts: string[]): Promise<Map<string, string>> {
    return this.translateMany(
      texts.filter((text) => this.hasCyrillic(text)),
      'bg',
      'en',
    )
  }

  /** English for one editor field; text already without Cyrillic is kept verbatim. */
  private en(map: Map<string, string>, text: string | null | undefined): string {
    const value = text?.trim() ?? ''
    if (!value) return ''
    if (!this.hasCyrillic(value)) return value
    return map.get(value) ?? value
  }

  private englishReady(bg: string, en: string): boolean {
    if (bg.trim() && !this.hasCyrillic(bg)) return true
    return translationLooksReady(bg, en)
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
      } else if (block.type === 'image' || block.type === 'video') {
        if (block.captionBg) out.push(block.captionBg)
      } else if (block.type === 'collage') {
        if (block.captionBg) out.push(block.captionBg)
        for (const item of block.items) {
          if (item.captionBg) out.push(item.captionBg)
        }
      } else if (block.textBg) {
        out.push(block.textBg)
      }
    }
    return out
  }

  /** Fill the `*En` side of every block; `*Bg` stays exactly as the editor wrote it. */
  private translateBody(
    body: StoredArticleBlock[],
    map: Map<string, string>,
  ): StoredArticleBlock[] {
    return body.map((block) => {
      if (block.type === 'note') {
        return {
          ...block,
          labelEn: this.en(map, block.labelBg),
          textEn: this.en(map, block.textBg),
        }
      }
      if (block.type === 'image' || block.type === 'video') {
        if (!block.captionBg) return block
        return { ...block, captionEn: this.en(map, block.captionBg) }
      }
      if (block.type === 'collage') {
        return {
          ...block,
          captionEn: block.captionBg
            ? this.en(map, block.captionBg)
            : (block.captionEn ?? ''),
          items: block.items.map((item) =>
            item.captionBg
              ? { ...item, captionEn: this.en(map, item.captionBg) }
              : item,
          ),
        }
      }
      return { ...block, textEn: this.en(map, block.textBg) }
    })
  }
}

/** "Стара Загора" → "Stara Zagora" (official transliteration, original casing). */
export function transliterateName(input: string): string {
  return input
    .split(/(\s+|-)/)
    .map((part) => {
      const latin = transliterateBg(part)
      const first = part.charAt(0)
      return first && first !== first.toLowerCase()
        ? latin.charAt(0).toUpperCase() + latin.slice(1)
        : latin
    })
    .join('')
}
