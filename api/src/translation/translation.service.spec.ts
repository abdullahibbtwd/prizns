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

  it('processes article translation end-to-end', async () => {
    const article = buildArticleRow({
      categoryBg: 'Категория',
      titleBg: 'Заглавие',
      subtitleBg: 'Подзаглавие',
      body: [{ type: 'paragraph', text: 'Текст' }],
    });
    prisma.article.findUniqueOrThrow = jest.fn().mockResolvedValue(article);
    prisma.article.findUnique = jest.fn().mockResolvedValue({
      translationStatus: TranslationStatus.RUNNING,
    });
    (translate as jest.Mock).mockResolvedValue({
      k0: { text: 'Category' },
      k1: { text: 'Title' },
      k2: { text: 'Subtitle' },
      k3: { text: '' },
      k4: { text: '' },
      k5: { text: '' },
      k6: { text: '' },
      k7: { text: 'End' },
      k8: { text: '' },
      k9: { text: '' },
      k10: { text: '' },
      k11: { text: '' },
      k12: { text: 'Body text' },
    });

    const promise = service.processArticle('art-1');
    await jest.runAllTimersAsync();
    await promise;

    expect(prisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          translationStatus: TranslationStatus.READY,
          titleEn: 'Title',
        }),
      }),
    );
  });
});
