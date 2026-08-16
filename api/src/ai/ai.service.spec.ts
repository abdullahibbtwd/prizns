import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUE_AI } from '../jobs/queue.constants';
import { AiService } from './ai.service';

describe('AiService static helpers', () => {
  describe('parseEmbedding', () => {
    it('parses numeric arrays', () => {
      expect(AiService.parseEmbedding([1, 2, 3])).toEqual([1, 2, 3]);
    });

    it('rejects invalid embeddings', () => {
      expect(AiService.parseEmbedding(null)).toBeNull();
      expect(AiService.parseEmbedding([])).toBeNull();
      expect(AiService.parseEmbedding(['a'])).toBeNull();
    });
  });

  describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
      expect(AiService.cosineSimilarity([1, 0], [1, 0])).toBe(1);
    });

    it('returns 0 for mismatched lengths', () => {
      expect(AiService.cosineSimilarity([1], [1, 0])).toBe(0);
    });

    it('returns 0 for zero vectors', () => {
      expect(AiService.cosineSimilarity([0, 0], [1, 1])).toBe(0);
    });
  });
});

describe('AiService', () => {
  let service: AiService;
  const prisma = {
    article: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  beforeEach(async () => {
    prisma.article.findMany.mockResolvedValue([]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'FEATURE_AI') return 'true';
              if (key === 'GEMINI_API_KEY') return 'test-key';
              return undefined;
            }),
          },
        },
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken(QUEUE_AI), useValue: { add: jest.fn() } },
      ],
    }).compile();

    service = module.get(AiService);
  });

  it('is enabled when feature flag and api key are set', () => {
    expect(service.isEnabled()).toBe(true);
  });

  it('rate limits public endpoints', () => {
    service.assertRateLimit('test-key', 2, 60_000);
    service.assertRateLimit('test-key', 2, 60_000);
    expect(() => service.assertRateLimit('test-key', 2, 60_000)).toThrow(
      BadRequestException,
    );
  });

  it('maps retired embedding models onto gemini-embedding-001', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'FEATURE_AI') return 'true';
              if (key === 'GEMINI_API_KEY') return 'test-key';
              if (key === 'GEMINI_EMBEDDING_MODEL') return 'text-embedding-004';
              return undefined;
            }),
          },
        },
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken(QUEUE_AI), useValue: { add: jest.fn() } },
      ],
    }).compile();
    const mapped = module.get(AiService);
    expect((mapped as unknown as { embeddingModel: string }).embeddingModel).toBe(
      'gemini-embedding-001',
    );
  });

  it('refuses archive questions when nothing is similar', async () => {
    jest.spyOn(service, 'embedText').mockResolvedValue([1, 0, 0]);
    const result = await service.askArchive({ question: 'What is Kukeri?' });
    expect(result).toEqual({
      refused: true,
      answer: null,
      lang: 'en',
      citations: [],
    });
  });
});
