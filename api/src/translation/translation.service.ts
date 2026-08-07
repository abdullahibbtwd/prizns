import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { type Article, type Prisma, TranslationStatus } from '@prisma/client';
import { translate } from 'google-translate-api-x';
import type { StoredArticleBlock } from '../articles/article.types';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const ARTICLE_QUEUE = 'jobs:translate:articles';
const AUTHOR_QUEUE = 'jobs:translate:authors';
const SERIES_QUEUE = 'jobs:translate:series';
const CHUNK_SIZE = 25;
const CHUNK_DELAY_MS = 700;

type Lang = 'bg' | 'en';

@Injectable()
export class TranslationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TranslationService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.logger.log(
      'Translation worker ready (google-translate-api-x, auto bg ↔ en)',
    );
    this.timer = setInterval(() => {
      void this.tick();
    }, 2000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async enqueue(articleId: string): Promise<void> {
    await this.prisma.article.update({
      where: { id: articleId },
      data: {
        translationStatus: TranslationStatus.PENDING,
        translationError: null,
      },
    });
    await this.redis.client.lrem(ARTICLE_QUEUE, 0, articleId);
    await this.redis.client.lpush(ARTICLE_QUEUE, articleId);
    this.logger.log(`Queued article translation for ${articleId}`);
  }

  async enqueueAuthor(authorId: string): Promise<void> {
    await this.prisma.author.update({
      where: { id: authorId },
      data: {
        translationStatus: TranslationStatus.PENDING,
        translationError: null,
      },
    });
    await this.redis.client.lrem(AUTHOR_QUEUE, 0, authorId);
    await this.redis.client.lpush(AUTHOR_QUEUE, authorId);
    this.logger.log(`Queued author translation for ${authorId}`);
  }

  async enqueueSeries(seriesId: string): Promise<void> {
    await this.prisma.series.update({
      where: { id: seriesId },
      data: {
        translationStatus: TranslationStatus.PENDING,
        translationError: null,
      },
    });
    await this.redis.client.lrem(SERIES_QUEUE, 0, seriesId);
    await this.redis.client.lpush(SERIES_QUEUE, seriesId);
    this.logger.log(`Queued series translation for ${seriesId}`);
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const articleId =
        (await this.redis.client.rpop(ARTICLE_QUEUE)) ??
        (
          await this.prisma.article.findFirst({
            where: { translationStatus: TranslationStatus.PENDING },
            orderBy: { updatedAt: 'asc' },
            select: { id: true },
          })
        )?.id ??
        null;
      if (articleId) {
        await this.processArticle(articleId);
        return;
      }

      const authorId =
        (await this.redis.client.rpop(AUTHOR_QUEUE)) ??
        (
          await this.prisma.author.findFirst({
            where: { translationStatus: TranslationStatus.PENDING },
            orderBy: { updatedAt: 'asc' },
            select: { id: true },
          })
        )?.id ??
        null;
      if (authorId) {
        await this.processAuthor(authorId);
        return;
      }

      const seriesId =
        (await this.redis.client.rpop(SERIES_QUEUE)) ??
        (
          await this.prisma.series.findFirst({
            where: { translationStatus: TranslationStatus.PENDING },
            orderBy: { updatedAt: 'asc' },
            select: { id: true },
          })
        )?.id ??
        null;
      if (seriesId) {
        await this.processSeries(seriesId);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Translation tick failed: ${message}`);
    } finally {
      this.running = false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Detect whether editor text is primarily Bulgarian or English. */
  private detectSourceLang(texts: string[]): Lang {
    const sample = texts
      .map((t) => t?.trim() ?? '')
      .filter(Boolean)
      .join(' ')
      .slice(0, 4000);
    if (!sample) return 'bg';

    const cyrillic = (sample.match(/\p{Script=Cyrillic}/gu) ?? []).length;
    const latin = (sample.match(/[A-Za-z]/g) ?? []).length;

    if (cyrillic === 0 && latin === 0) return 'bg';
    // Prefer BG when Cyrillic is at least half as common as Latin (mixed copy)
    if (cyrillic > 0 && cyrillic >= latin * 0.35) return 'bg';
    if (latin > cyrillic) return 'en';
    return 'bg';
  }

  private async translateMany(
    texts: string[],
    from: Lang,
    to: Lang,
  ): Promise<Map<string, string>> {
    const unique = [...new Set(texts.map((t) => t.trim()).filter(Boolean))];
    const map = new Map<string, string>();
    if (unique.length === 0) return map;

    for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
      const chunk = unique.slice(i, i + CHUNK_SIZE);
      const payload: Record<string, string> = {};
      chunk.forEach((text, index) => {
        payload[`k${index}`] = text;
      });

      let attempts = 0;
      while (attempts < 4) {
        try {
          const result = await translate(payload, {
            from,
            to,
            forceBatch: true,
            forceFrom: true,
            forceTo: true,
          });

          chunk.forEach((text, index) => {
            const key = `k${index}`;
            const item = result[key];
            const translated =
              typeof item === 'string'
                ? item
                : item && typeof item === 'object' && 'text' in item
                  ? String(item.text)
                  : text;
            map.set(text, translated);
          });
          break;
        } catch (error: unknown) {
          attempts += 1;
          const wait = CHUNK_DELAY_MS * attempts * 2;
          this.logger.warn(
            `Translate batch failed ${from}→${to} (attempt ${attempts}), waiting ${wait}ms`,
          );
          await this.sleep(wait);
          if (attempts >= 4) throw error;
        }
      }

      if (i + CHUNK_SIZE < unique.length) {
        await this.sleep(CHUNK_DELAY_MS);
      }
    }

    return map;
  }

  private tr(
    map: Map<string, string>,
    text: string | null | undefined,
  ): string {
    const value = text?.trim() ?? '';
    if (!value) return '';
    return map.get(value) ?? value;
  }

  /**
   * Editor fields are stored under *Bg. After translation:
   * - source bg → keep Bg, fill En with translation
   * - source en → move original into En, put BG translation into Bg
   */
  private pair(
    map: Map<string, string>,
    sourceText: string | null | undefined,
    sourceLang: Lang,
  ): { bg: string; en: string } {
    const original = sourceText?.trim() ?? '';
    if (!original) return { bg: '', en: '' };
    const translated = this.tr(map, original);
    if (sourceLang === 'bg') {
      return { bg: original, en: translated };
    }
    return { bg: translated, en: original };
  }

  private collectFromBody(body: StoredArticleBlock[]): string[] {
    const out: string[] = [];
    for (const block of body) {
      out.push(block.textBg);
      if (block.type === 'pullquote') out.push(block.citeBg);
      if (block.type === 'note') out.push(block.labelBg);
    }
    return out;
  }

  private parseBody(body: Prisma.JsonValue): StoredArticleBlock[] {
    if (!Array.isArray(body)) return [];
    return body as StoredArticleBlock[];
  }

  private translateBody(
    body: StoredArticleBlock[],
    map: Map<string, string>,
    sourceLang: Lang,
  ): StoredArticleBlock[] {
    return body.map((block) => {
      if (block.type === 'pullquote') {
        const text = this.pair(map, block.textBg, sourceLang);
        const cite = this.pair(map, block.citeBg, sourceLang);
        return {
          ...block,
          textBg: text.bg,
          textEn: text.en,
          citeBg: cite.bg,
          citeEn: cite.en,
        };
      }
      if (block.type === 'note') {
        const label = this.pair(map, block.labelBg, sourceLang);
        const text = this.pair(map, block.textBg, sourceLang);
        return {
          ...block,
          labelBg: label.bg,
          labelEn: label.en,
          textBg: text.bg,
          textEn: text.en,
        };
      }
      const text = this.pair(map, block.textBg, sourceLang);
      return {
        ...block,
        textBg: text.bg,
        textEn: text.en,
      };
    });
  }

  private async processArticle(articleId: string): Promise<void> {
    await this.prisma.article.update({
      where: { id: articleId },
      data: { translationStatus: TranslationStatus.RUNNING },
    });

    try {
      const article: Article = await this.prisma.article.findUniqueOrThrow({
        where: { id: articleId },
      });
      const body = this.parseBody(article.body);

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
        ...this.collectFromBody(body),
      ];

      const sourceLang = this.detectSourceLang([
        article.titleBg,
        article.subtitleBg,
        ...this.collectFromBody(body).slice(0, 3),
      ]);
      const targetLang: Lang = sourceLang === 'bg' ? 'en' : 'bg';
      this.logger.log(
        `Article ${articleId}: detected ${sourceLang} → translating to ${targetLang}`,
      );

      const map = await this.translateMany(sources, sourceLang, targetLang);
      const translatedBody = this.translateBody(body, map, sourceLang);

      const category = this.pair(map, article.categoryBg, sourceLang);
      const title = this.pair(map, article.titleBg, sourceLang);
      const subtitle = this.pair(map, article.subtitleBg, sourceLang);
      const readTime = this.pair(map, article.readTimeBg, sourceLang);
      const location = this.pair(map, article.locationBg, sourceLang);
      const date = this.pair(map, article.dateBg, sourceLang);
      const photoCredit = this.pair(map, article.photoCreditBg, sourceLang);
      const endLabel = this.pair(map, article.endLabelBg, sourceLang);
      const speaker = article.speakerBg
        ? this.pair(map, article.speakerBg, sourceLang)
        : null;

      const latest = await this.prisma.article.findUnique({
        where: { id: articleId },
        select: { translationStatus: true },
      });
      if (latest?.translationStatus !== TranslationStatus.RUNNING) {
        this.logger.warn(
          `Skip stale article translation write for ${articleId}`,
        );
        return;
      }

      await this.prisma.article.update({
        where: { id: articleId },
        data: {
          translationStatus: TranslationStatus.READY,
          translationError: null,
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
          body: translatedBody,
        },
      });
      this.logger.log(`Translated article ${articleId} (${sourceLang}→${targetLang})`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.article.update({
        where: { id: articleId },
        data: {
          translationStatus: TranslationStatus.FAILED,
          translationError: message,
        },
      });
      this.logger.error(
        `Article translation failed for ${articleId}: ${message}`,
      );
    }
  }

  private async processAuthor(authorId: string): Promise<void> {
    await this.prisma.author.update({
      where: { id: authorId },
      data: { translationStatus: TranslationStatus.RUNNING },
    });

    try {
      const author = await this.prisma.author.findUniqueOrThrow({
        where: { id: authorId },
      });

      const sources = [
        author.nameBg,
        author.roleBg,
        author.locationBg ?? '',
        author.quoteBg ?? '',
        author.bioBg ?? '',
      ];
      const sourceLang = this.detectSourceLang(sources);
      const targetLang: Lang = sourceLang === 'bg' ? 'en' : 'bg';
      this.logger.log(
        `Author ${authorId}: detected ${sourceLang} → translating to ${targetLang}`,
      );

      const map = await this.translateMany(sources, sourceLang, targetLang);

      const name = this.pair(map, author.nameBg, sourceLang);
      const role = this.pair(map, author.roleBg, sourceLang);
      const location = author.locationBg
        ? this.pair(map, author.locationBg, sourceLang)
        : null;
      const quote = author.quoteBg
        ? this.pair(map, author.quoteBg, sourceLang)
        : null;
      const bio = author.bioBg
        ? this.pair(map, author.bioBg, sourceLang)
        : null;

      const latest = await this.prisma.author.findUnique({
        where: { id: authorId },
        select: { translationStatus: true },
      });
      if (latest?.translationStatus !== TranslationStatus.RUNNING) {
        this.logger.warn(
          `Skip stale author translation write for ${authorId}`,
        );
        return;
      }

      await this.prisma.author.update({
        where: { id: authorId },
        data: {
          translationStatus: TranslationStatus.READY,
          translationError: null,
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
      });
      this.logger.log(`Translated author ${authorId} (${sourceLang}→${targetLang})`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.author.update({
        where: { id: authorId },
        data: {
          translationStatus: TranslationStatus.FAILED,
          translationError: message,
        },
      });
      this.logger.error(
        `Author translation failed for ${authorId}: ${message}`,
      );
    }
  }

  private async processSeries(seriesId: string): Promise<void> {
    await this.prisma.series.update({
      where: { id: seriesId },
      data: { translationStatus: TranslationStatus.RUNNING },
    });

    try {
      const series = await this.prisma.series.findUniqueOrThrow({
        where: { id: seriesId },
      });

      const sources = [series.titleBg, series.descriptionBg];
      const sourceLang = this.detectSourceLang(sources);
      const targetLang: Lang = sourceLang === 'bg' ? 'en' : 'bg';
      this.logger.log(
        `Series ${seriesId}: detected ${sourceLang} → translating to ${targetLang}`,
      );

      const map = await this.translateMany(sources, sourceLang, targetLang);
      const title = this.pair(map, series.titleBg, sourceLang);
      const description = series.descriptionBg
        ? this.pair(map, series.descriptionBg, sourceLang)
        : null;

      const latest = await this.prisma.series.findUnique({
        where: { id: seriesId },
        select: { translationStatus: true },
      });
      if (latest?.translationStatus !== TranslationStatus.RUNNING) {
        this.logger.warn(
          `Skip stale series translation write for ${seriesId}`,
        );
        return;
      }

      await this.prisma.series.update({
        where: { id: seriesId },
        data: {
          translationStatus: TranslationStatus.READY,
          translationError: null,
          titleBg: title.bg,
          titleEn: title.en || null,
          descriptionBg: description?.bg ?? series.descriptionBg,
          descriptionEn: description?.en || null,
        },
      });
      this.logger.log(`Translated series ${seriesId} (${sourceLang}→${targetLang})`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.series.update({
        where: { id: seriesId },
        data: {
          translationStatus: TranslationStatus.FAILED,
          translationError: message,
        },
      });
      this.logger.error(
        `Series translation failed for ${seriesId}: ${message}`,
      );
    }
  }
}
