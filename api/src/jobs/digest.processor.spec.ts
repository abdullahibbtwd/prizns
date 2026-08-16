import { Test } from '@nestjs/testing';
import { DigestProcessor } from './digest.processor';
import { DigestService } from '../digest/digest.service';

describe('DigestProcessor', () => {
  let processor: DigestProcessor;
  const digest = { sendDaily: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DigestProcessor,
        { provide: DigestService, useValue: digest },
      ],
    }).compile();
    processor = module.get(DigestProcessor);
    digest.sendDaily.mockReset();
  });

  it('treats skipped daily digest as success', async () => {
    digest.sendDaily.mockResolvedValue({ status: 'skipped', reason: 'no-episode' });
    await expect(
      processor.process({ id: '1', name: 'daily', attemptsMade: 0 } as never),
    ).resolves.toBeUndefined();
  });

  it('logs a successful send', async () => {
    digest.sendDaily.mockResolvedValue({
      status: 'sent',
      articleId: 'art-1',
      recipientCount: 4,
    });
    await processor.process({
      id: '1',
      name: 'daily',
      attemptsMade: 0,
    } as never);
    expect(digest.sendDaily).toHaveBeenCalled();
  });
});
