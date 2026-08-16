import { Test } from '@nestjs/testing';
import { PublishProcessor } from './publish.processor';
import { ArticlesService } from '../articles/articles.service';

describe('PublishProcessor', () => {
  let processor: PublishProcessor;
  const articles = { publishDueScheduled: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PublishProcessor,
        { provide: ArticlesService, useValue: articles },
      ],
    }).compile();
    processor = module.get(PublishProcessor);
    articles.publishDueScheduled.mockReset();
  });

  it('promotes due scheduled stories', async () => {
    articles.publishDueScheduled.mockResolvedValue({ published: 2 });
    await processor.process({ id: '1', name: 'due' } as never);
    expect(articles.publishDueScheduled).toHaveBeenCalled();
  });

  it('is quiet when nothing is due', async () => {
    articles.publishDueScheduled.mockResolvedValue({ published: 0 });
    await expect(
      processor.process({ id: '1', name: 'due' } as never),
    ).resolves.toBeUndefined();
  });
});
