import { Test, TestingModule } from '@nestjs/testing';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { TranslationService } from '../translation/translation.service';
import { TtsService } from '../tts/tts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { overrideGuards } from '../../test/helpers/guards';

describe('ArticlesController', () => {
  let controller: ArticlesController;
  const articles = {
    listPublic: jest.fn(),
    getPublicBySectionSlug: jest.fn(),
    listRelated: jest.fn(),
    addRelate: jest.fn(),
    listCms: jest.fn(),
    getCmsById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const translation = { enqueue: jest.fn() };
  const tts = { enqueue: jest.fn(), clearNarration: jest.fn() };

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [ArticlesController],
      providers: [
        { provide: ArticlesService, useValue: articles },
        { provide: TranslationService, useValue: translation },
        { provide: TtsService, useValue: tts },
      ],
    });
    overrideGuards(builder, JwtAuthGuard);
    const module = await builder.compile();
    controller = module.get(ArticlesController);
  });

  it('lists public articles', () => {
    controller.listPublic('stories');
    expect(articles.listPublic).toHaveBeenCalled();
  });

  it('passes search query and limit to listPublic', () => {
    controller.listPublic(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'vidin',
      '8',
    );
    expect(articles.listPublic).toHaveBeenCalledWith(
      undefined,
      undefined,
      expect.objectContaining({ q: 'vidin', limit: 8 }),
    );
  });

  it('gets cms article by id', () => {
    controller.getCms('art-1');
    expect(articles.getCmsById).toHaveBeenCalledWith('art-1');
  });

  it('queues translation after create when pending', async () => {
    articles.create.mockResolvedValue({ id: 'art-1', translationStatus: 'PENDING' });
    await controller.create({ titleBg: 'Test' } as never);
    expect(translation.enqueue).toHaveBeenCalledWith('art-1');
  });

  it('delegates narrate to tts service', () => {
    controller.narrate('art-1');
    expect(tts.enqueue).toHaveBeenCalledWith('art-1');
  });
});
