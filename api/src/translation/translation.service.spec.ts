import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { TranslationStatus } from '@prisma/client';
import { translate } from 'google-translate-api-x';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUE_TRANSLATE } from '../jobs/queue.constants';
import { createMockPrisma } from '../../test/helpers/mocks';
import { buildArticleRow } from '../../test/helpers/factories';
import { TranslationService } from './translation.service';

jest.mock('google-translate-api-x', () => ({
  translate: jest.fn(),
}));

describe('TranslationService', () => {
  let service: TranslationService;
  let prisma: ReturnType<typeof createMockPrisma>;
  const queue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };

  beforeEach(async () => {
    prisma = createMockPrisma({
      article: {
        update: jest.fn().mockResolvedValue({ id: 'art-1' }),
        findUniqueOrThrow: jest.fn(),
        findUnique: jest.fn(),
      },
      author: {
        update: jest.fn().mockResolvedValue({ id: 'author-1' }),
        findUniqueOrThrow: jest.fn(),
        findUnique: jest.fn(),
      },
      series: {
        update: jest.fn().mockResolvedValue({ id: 'series-1' }),
        findUniqueOrThrow: jest.fn(),
        findUnique: jest.fn(),
      },
      category: {
        update: jest.fn().mockResolvedValue({ id: 'cat-1' }),
        findUniqueOrThrow: jest.fn(),
        findUnique: jest.fn(),
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranslationService,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken(QUEUE_TRANSLATE), useValue: queue },
      ],
    }).compile();

    service = module.get(TranslationService);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('enqueues article translation', async () => {
    await service.enqueue('art-1');
    expect(prisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'art-1' },
        data: expect.objectContaining({
          translationStatus: TranslationStatus.PENDING,
        }),
      }),
    );
    expect(queue.add).toHaveBeenCalled();
  });

  it('enqueues author translation', async () => {
    await service.enqueueAuthor('author-1');
    expect(prisma.author.update).toHaveBeenCalled();
  });

  it('enqueues series translation', async () => {
    await service.enqueueSeries('series-1');
    expect(prisma.series.update).toHaveBeenCalled();
  });

  it('enqueues category translation', async () => {
    await service.enqueueCategory('cat-1');
    expect(prisma.category.update).toHaveBeenCalled();
    expect(queue.add).toHaveBeenCalled();
  });

  it('returns empty bilingual pair for blank text', async () => {
    await expect(service.bilingualFromSingle('   ')).resolves.toEqual({
      bg: '',
      en: '',
    });
  });

  it('translates a single Bulgarian string', async () => {
    (translate as jest.Mock).mockResolvedValue({
      k0: { text: 'Story' },
    });
    const pair = await service.bilingualFromSingle('История');
    expect(pair.bg).toBe('История');
    expect(pair.en).toBe('Story');
  });

  it('marks article translation as failed', async () => {
    await service.markFailed('article', 'art-1', 'boom');
    expect(prisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          translationStatus: TranslationStatus.FAILED,
        }),
      }),
    );
  });

  it('marks author translation as failed', async () => {
    await service.markFailed('author', 'author-1', 'boom');
    expect(prisma.author.update).toHaveBeenCalled();
  });

  it('marks series translation as failed', async () => {
    await service.markFailed('series', 'series-1', 'boom');
    expect(prisma.series.update).toHaveBeenCalled();
  });

  it('marks category translation as failed', async () => {
    await service.markFailed('category', 'cat-1', 'boom');
    expect(prisma.category.update).toHaveBeenCalled();
  });

  describe('processing', () => {
    const DICT: Record<string, string> = {
      Категория: 'Category',
      Заглавие: 'Title',
      'Монтана е страхотна': 'Montana is great',
      Край: 'The End',
      Текст: 'Text',
    };
    const updatedAt = new Date('2026-09-01T10:00:00.000Z');

    beforeEach(() => {
      (translate as jest.Mock).mockImplementation(
        async (payload: Record<string, string>) =>
          Object.fromEntries(
            Object.entries(payload).map(([key, text]) => [
              key,
              { text: DICT[text] ?? text },
            ]),
          ),
      );
      prisma.article.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    });

    function givenArticle(overrides: Record<string, unknown>) {
      const article = buildArticleRow({ updatedAt, ...overrides });
      prisma.article.findUniqueOrThrow = jest.fn().mockResolvedValue(article);
      return article;
    }

    async function run(id = 'art-1') {
      const promise = service.processArticle(id);
      await jest.runAllTimersAsync();
      await promise;
    }

    function finalWrite() {
      const calls = (prisma.article.updateMany as jest.Mock).mock.calls;
      return calls[calls.length - 1][0] as {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      };
    }

    it('fills English fields and never rewrites the Bulgarian ones', async () => {
      givenArticle({
        categoryBg: 'Категория',
        titleBg: 'Заглавие',
        subtitleBg: 'Монтана е страхотна',
        body: [{ type: 'paragraph', textBg: 'Текст' }],
      });
      await run();

      const { where, data } = finalWrite();
      expect(where).toEqual({
        id: 'art-1',
        translationStatus: TranslationStatus.RUNNING,
        updatedAt,
      });
      expect(data).toEqual(
        expect.objectContaining({
          translationStatus: TranslationStatus.READY,
          titleEn: 'Title',
          subtitleEn: 'Montana is great',
          categoryEn: 'Category',
          updatedAt,
        }),
      );
      for (const key of Object.keys(data)) {
        expect(key.endsWith('Bg')).toBe(false);
      }
      expect(data.body).toEqual([
        { type: 'paragraph', textBg: 'Текст', textEn: 'Text' },
      ]);
    });

    it('keeps an English-typed field as-is instead of machine-translating it', async () => {
      givenArticle({
        titleBg: 'Заглавие',
        subtitleBg: 'Montana is great',
      });
      await run();
      const { data } = finalWrite();
      expect(data.subtitleEn).toBe('Montana is great');
      const sent = (translate as jest.Mock).mock.calls.flatMap(
        ([payload]: [Record<string, string>]) => Object.values(payload),
      );
      expect(sent).not.toContain('Montana is great');
    });

    it('marks FAILED when English is a copy of Bulgarian', async () => {
      (translate as jest.Mock).mockImplementation(
        async (payload: Record<string, string>) =>
          Object.fromEntries(
            Object.entries(payload).map(([key, text]) => [key, { text }]),
          ),
      );
      givenArticle({ titleBg: 'Заглавие' });
      await run();
      expect(finalWrite().data.translationStatus).toBe(
        TranslationStatus.FAILED,
      );
    });

    it('re-queues instead of overwriting when the story was saved mid-run', async () => {
      givenArticle({ titleBg: 'Заглавие' });
      prisma.article.updateMany = jest
        .fn()
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });
      prisma.article.findUnique = jest
        .fn()
        .mockResolvedValue({ translationStatus: TranslationStatus.RUNNING });
      queue.add.mockClear();
      await run();
      expect(queue.add).toHaveBeenCalledWith(
        'translate:article',
        { type: 'article', id: 'art-1' },
        expect.anything(),
      );
    });

    it('skips when the story changed before the run started', async () => {
      givenArticle({ titleBg: 'Заглавие' });
      prisma.article.updateMany = jest.fn().mockResolvedValue({ count: 0 });
      (translate as jest.Mock).mockClear();
      await run();
      expect(translate).not.toHaveBeenCalled();
      expect(prisma.article.updateMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('sweepStale', () => {
    beforeEach(() => {
      for (const model of ['article', 'author', 'series', 'category']) {
        (prisma[model] as Record<string, unknown>).findMany = jest
          .fn()
          .mockResolvedValue([]);
      }
      queue.add.mockClear();
    });

    it('re-queues orphaned rows when the queue is idle', async () => {
      Object.assign(queue, {
        getJobCounts: jest
          .fn()
          .mockResolvedValue({ waiting: 0, delayed: 0, active: 1 }),
      });
      (prisma.author as Record<string, jest.Mock>).findMany.mockResolvedValue([
        { id: 'author-1' },
      ]);
      await expect(service.sweepStale()).resolves.toBe(1);
      expect(queue.add).toHaveBeenCalledWith(
        'translate:author',
        { type: 'author', id: 'author-1' },
        expect.anything(),
      );
    });

    it('does nothing while jobs are still waiting', async () => {
      Object.assign(queue, {
        getJobCounts: jest
          .fn()
          .mockResolvedValue({ waiting: 3, delayed: 0, active: 1 }),
      });
      await expect(service.sweepStale()).resolves.toBe(0);
      expect(queue.add).not.toHaveBeenCalled();
    });
  });

  it('transliterates place names instead of translating them', async () => {
    (translate as jest.Mock).mockClear();
    await expect(
      service.bilingualFromSingle('Лом', { place: true }),
    ).resolves.toEqual({ bg: 'Лом', en: 'Lom' });
    await expect(
      service.bilingualFromSingle('Стара Загора', { place: true }),
    ).resolves.toEqual({ bg: 'Стара Загора', en: 'Stara Zagora' });
    expect(translate).not.toHaveBeenCalled();
  });
});
