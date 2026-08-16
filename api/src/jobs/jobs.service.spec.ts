import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import {
  QUEUE_AI,
  QUEUE_DIGEST,
  QUEUE_PUBLISH,
  QUEUE_SOCIAL,
  QUEUE_TRANSLATE,
  QUEUE_TTS,
} from './queue.constants';
import { JobsService } from './jobs.service';

describe('JobsService', () => {
  let service: JobsService;
  const translateQueue = {
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    getWaitingCount: jest.fn().mockResolvedValue(2),
  };
  const digestQueue = {
    add: jest.fn(),
    upsertJobScheduler: jest.fn().mockResolvedValue(undefined),
  };
  const publishQueue = {
    add: jest.fn(),
    upsertJobScheduler: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: getQueueToken(QUEUE_TRANSLATE), useValue: translateQueue },
        { provide: getQueueToken(QUEUE_AI), useValue: { add: jest.fn() } },
        { provide: getQueueToken(QUEUE_TTS), useValue: { add: jest.fn() } },
        { provide: getQueueToken(QUEUE_SOCIAL), useValue: { add: jest.fn() } },
        { provide: getQueueToken(QUEUE_DIGEST), useValue: digestQueue },
        { provide: getQueueToken(QUEUE_PUBLISH), useValue: publishQueue },
      ],
    }).compile();

    service = module.get(JobsService);
  });

  it('enqueues translate jobs with stable job id', async () => {
    await service.enqueueTranslate({ type: 'article', id: 'art-1' });
    expect(translateQueue.add).toHaveBeenCalledWith(
      'translate:article',
      { type: 'article', id: 'art-1' },
      expect.objectContaining({ jobId: 'translate:article:art-1' }),
    );
  });

  it('reports translate queue waiting count', async () => {
    await expect(service.pingTranslateQueue()).resolves.toEqual({
      waiting: 2,
      name: QUEUE_TRANSLATE,
    });
  });

  it('exposes all queue handles', () => {
    expect(service.queues.translate).toBe(translateQueue);
    expect(service.queues.ai).toBeDefined();
    expect(service.queues.publish).toBe(publishQueue);
  });

  it('registers the daily digest scheduler', async () => {
    await service.onModuleInit();
    expect(digestQueue.upsertJobScheduler).toHaveBeenCalledWith(
      'digest-daily',
      { pattern: '0 8 * * *', tz: 'Europe/Sofia' },
      expect.objectContaining({ name: 'daily' }),
    );
  });

  it('registers the scheduled publish checker', async () => {
    await service.onModuleInit();
    expect(publishQueue.upsertJobScheduler).toHaveBeenCalledWith(
      'publish-due',
      { pattern: '* * * * *' },
      expect.objectContaining({ name: 'due' }),
    );
  });
});
