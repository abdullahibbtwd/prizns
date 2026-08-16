import { Test, TestingModule } from '@nestjs/testing';
import { StoryYearPublicController } from './story-year-public.controller';
import { StoryYearService } from './story-year.service';
import { ReaderAuthService } from '../reader-auth/reader-auth.service';
import { ReaderJwtAuthGuard } from '../reader-auth/guards/reader-jwt-auth.guard';
import { overrideGuards } from '../../test/helpers/guards';

describe('StoryYearPublicController', () => {
  let controller: StoryYearPublicController;
  const storyYear = { getPublicCurrent: jest.fn(), castVote: jest.fn() };
  const readerAuth = { peekReaderId: jest.fn() };
  const reader = {
    id: 'reader-1',
    email: 'reader@example.com',
    name: null,
    locale: 'bg',
  };

  beforeEach(async () => {
    readerAuth.peekReaderId.mockResolvedValue(null);
    const builder = Test.createTestingModule({
      controllers: [StoryYearPublicController],
      providers: [
        { provide: StoryYearService, useValue: storyYear },
        { provide: ReaderAuthService, useValue: readerAuth },
      ],
    });
    overrideGuards(builder, ReaderJwtAuthGuard);
    const module = await builder.compile();
    controller = module.get(StoryYearPublicController);
  });

  it('loads current campaign with optional reader id', async () => {
    const req = { cookies: {} } as never;
    await controller.current(req);
    expect(readerAuth.peekReaderId).toHaveBeenCalled();
    expect(storyYear.getPublicCurrent).toHaveBeenCalledWith(null);
  });

  it('casts vote for reader', () => {
    controller.vote(reader, { articleId: 'art-1' });
    expect(storyYear.castVote).toHaveBeenCalledWith(reader.id, 'art-1');
  });
});
