import { Test } from '@nestjs/testing';
import { MediaProcessor } from './media.processor';
import { MediaService } from '../media/media.service';

describe('MediaProcessor', () => {
  let processor: MediaProcessor;
  const media = {
    processJob: jest.fn(),
    markFailed: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MediaProcessor,
        { provide: MediaService, useValue: media },
      ],
    }).compile();
    processor = module.get(MediaProcessor);
    media.processJob.mockReset().mockResolvedValue(undefined);
    media.markFailed.mockReset().mockResolvedValue(undefined);
  });

  it('processes the media job payload', async () => {
    await processor.process({
      id: '1',
      attemptsMade: 0,
      data: { mediaId: 'm1', tempPath: '/tmp/a.jpg', folder: 'cms' },
    } as never);
    expect(media.processJob).toHaveBeenCalledWith(
      expect.objectContaining({ mediaId: 'm1' }),
    );
  });

  it('marks the record failed after retries are exhausted', async () => {
    await processor.onFailed(
      {
        data: { mediaId: 'm1' },
        attemptsMade: 3,
        opts: { attempts: 3 },
      } as never,
      new Error('sharp failed'),
    );
    expect(media.markFailed).toHaveBeenCalledWith('m1', 'sharp failed');
  });

  it('does not mark failed while retries remain', async () => {
    await processor.onFailed(
      {
        data: { mediaId: 'm1' },
        attemptsMade: 1,
        opts: { attempts: 3 },
      } as never,
      new Error('blip'),
    );
    expect(media.markFailed).not.toHaveBeenCalled();
  });
});
