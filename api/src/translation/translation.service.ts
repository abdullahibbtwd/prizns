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
      'Translation worker ready (google-translate-api-x, bg → en)',
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

  private async translateMany(texts: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(texts.map((t) => t.trim()).filter(Boolean))];
    const map = new Map<string, string>();

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
            from: 'bg',
            to: 'en',
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
            `Translate batch failed (attempt ${attempts}), waiting ${wait}ms`,
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
  ): StoredArticleBlock[] {
    return body.map((block) => {
      if (block.type === 'pullquote') {
        return {
          ...block,
          textEn: this.tr(map, block.textBg),
          citeEn: this.tr(map, block.citeBg),
        };
      }
      if (block.type === 'note') {
        return {
          ...block,
          labelEn: this.tr(map, block.labelBg),
          textEn: this.tr(map, block.textBg),
        };
      }
      return {
        ...block,
        textEn: this.tr(map, block.textBg),
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

      const map = await this.translateMany(sources);
      const translatedBody = this.translateBody(body, map);

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
          categoryEn: this.tr(map, article.categoryBg),
          titleEn: this.tr(map, article.titleBg),
          subtitleEn: this.tr(map, article.subtitleBg),
          readTimeEn: this.tr(map, article.readTimeBg),
          locationEn: this.tr(map, article.locationBg),
          dateEn: this.tr(map, article.dateBg),
          photoCreditEn: this.tr(map, article.photoCreditBg),
          endLabelEn: this.tr(map, article.endLabelBg),
          speakerEn: article.speakerBg ? this.tr(map, article.speakerBg) : null,
          body: translatedBody,
        },
      });
      this.logger.log(`Translated article ${articleId}`);
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
      const map = await this.translateMany(sources);

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
          nameEn: this.tr(map, author.nameBg) || null,
          roleEn: this.tr(map, author.roleBg) || null,
          locationEn: author.locationBg
            ? this.tr(map, author.locationBg)
            : null,
          quoteEn: author.quoteBg ? this.tr(map, author.quoteBg) : null,
          bioEn: author.bioBg ? this.tr(map, author.bioBg) : null,
        },
      });
      this.logger.log(`Translated author ${authorId}`);
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
      const map = await this.translateMany(sources);

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
          titleEn: this.tr(map, series.titleBg) || null,
          descriptionEn: series.descriptionBg
            ? this.tr(map, series.descriptionBg)
            : null,
        },
      });
      this.logger.log(`Translated series ${seriesId}`);
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
