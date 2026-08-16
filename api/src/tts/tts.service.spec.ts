import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NarrationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { QUEUE_TTS } from '../jobs/queue.constants';
import { createMockConfig, createMockPrisma } from '../../test/helpers/mocks';
import { TtsService } from './tts.service';

describe('TtsService', () => {
  let service: TtsService;
  let prisma: ReturnType<typeof createMockPrisma>;
  const queue = { add: jest.fn() };
  const storage = { uploadBuffer: jest.fn() };

  beforeEach(async () => {
    prisma = createMockPrisma({
      article: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'art-1',
          titleBg: 'Заглавие',
          body: [{ type: 'paragraph', text: 'Текст' }],
        }),
        update: jest.fn(),
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TtsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        {
          provide: ConfigService,
          useValue: createMockConfig({ FEATURE_TTS: 'true' }),
        },
        { provide: getQueueToken(QUEUE_TTS), useValue: queue },
      ],
    }).compile();

    service = module.get(TtsService);
  });

  it('throws when tts disabled', async () => {
    const disabledModule = await Test.createTestingModule({
      providers: [
        TtsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        {
          provide: ConfigService,
          useValue: createMockConfig({ FEATURE_TTS: 'false' }),
        },
        { provide: getQueueToken(QUEUE_TTS), useValue: queue },
      ],
    }).compile();
    const disabled = disabledModule.get(TtsService);
    await expect(disabled.enqueue('art-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('throws when article missing', async () => {
    prisma.article.findUnique = jest.fn().mockResolvedValue(null);
    await expect(service.enqueue('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws when article has no narratable text', async () => {
    prisma.article.findUnique = jest.fn().mockResolvedValue({
      id: 'art-1',
      titleBg: '',
      body: [],
    });
    await expect(service.enqueue('art-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('queues narration when credentials path resolves', async () => {
    jest.spyOn(service as never as { resolveCredentialsPath: () => string }, 'resolveCredentialsPath').mockReturnValue('/secrets/key.json');
    await service.enqueue('art-1');
    expect(prisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          narrationStatus: NarrationStatus.PENDING,
        }),
      }),
    );
    expect(queue.add).toHaveBeenCalled();
  });
});
