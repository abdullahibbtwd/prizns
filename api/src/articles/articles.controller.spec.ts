import { Test, TestingModule } from '@nestjs/testing';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { TranslationService } from '../translation/translation.service';
import { TtsService } from '../tts/tts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { overrideGuards } from '../../test/helpers/guards';
import { mockAuthUser } from '../../test/helpers/mocks';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

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
    requestChanges: jest.fn(),
    storyScope: jest.fn().mockResolvedValue(undefined),
    assertCanViewStory: jest.fn().mockResolvedValue(undefined),
    assertCanChangeStory: jest.fn().mockResolvedValue(undefined),
    assertCanSetStatus: jest.fn(),
    authorIdForWrite: jest.fn(async (_user: unknown, id?: string) => id),
  };
  const user = mockAuthUser;
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

  it('passes page and pageSize to listPublic', () => {
    controller.listPublic(
      'stories',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      '2',
      '30',
    );
    expect(articles.listPublic).toHaveBeenCalledWith(
      'stories',
      undefined,
      expect.objectContaining({ page: 2, pageSize: 30 }),
    );
  });

  it('gets cms article by id after the ownership check', async () => {
    await controller.getCms('art-1', user);
    expect(articles.assertCanViewStory).toHaveBeenCalledWith('art-1', user);
    expect(articles.getCmsById).toHaveBeenCalledWith('art-1');
  });

  it('limits an author to their own stories in the CMS list', async () => {
    articles.storyScope.mockResolvedValueOnce('author-own');
    await controller.listCms(
      undefined,
      undefined,
      'someone-else',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      user,
    );
    expect(articles.listCms).toHaveBeenLastCalledWith(
      expect.objectContaining({ authorId: 'author-own' }),
    );
  });

  it('blocks an author from editing someone else\'s story', async () => {
    articles.assertCanChangeStory.mockRejectedValueOnce(new Error('forbidden'));
    await expect(
      controller.update('art-2', { titleBg: 'x' } as never, user),
    ).rejects.toThrow('forbidden');
    expect(articles.update).not.toHaveBeenCalled();
  });

  it('checks the requested status before saving', async () => {
    articles.update.mockResolvedValue({ id: 'art-1' });
    await controller.update('art-1', { status: 'PUBLISHED' } as never, user);
    expect(articles.assertCanChangeStory).toHaveBeenCalledWith(
      'art-1',
      user,
      'PUBLISHED',
    );
  });

  it('checks the status and drops any publish date when an author creates a story', async () => {
    const author = { ...user, role: 'AUTHOR', roles: ['AUTHOR'] } as never;
    articles.create.mockResolvedValue({ id: 'art-9', translationStatus: 'READY' });
    const dto = {
      titleBg: 'Mine',
      status: 'REVIEW',
      publishedAt: '2026-10-01T09:00:00.000Z',
    } as never as { publishedAt?: string };
    await controller.create(dto as never, author);
    expect(articles.assertCanSetStatus).toHaveBeenCalledWith(author, 'REVIEW');
    expect(articles.create).toHaveBeenCalledWith(
      expect.not.objectContaining({ publishedAt: expect.anything() }),
      { notifyOnSubmit: true },
    );
  });

  it('does not alert moderators when a moderator saves a story', async () => {
    articles.update.mockResolvedValue({ id: 'art-1' });
    await controller.update('art-1', { status: 'REVIEW' } as never, user);
    expect(articles.update).toHaveBeenLastCalledWith(
      'art-1',
      expect.anything(),
      { notifyOnSubmit: false },
    );
  });

  it('sends a story back to its author with a note', async () => {
    articles.requestChanges.mockResolvedValue({ id: 'art-1', status: 'DRAFT' });
    await controller.requestChanges('art-1', { note: 'Fix the caption' });
    expect(articles.requestChanges).toHaveBeenCalledWith(
      'art-1',
      'Fix the caption',
    );
  });

  it('lets only publishers send a story back', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      ArticlesController.prototype.requestChanges,
    ) as string[];
    expect(roles).toEqual(['ADMIN', 'MODERATOR', 'EDITOR']);
  });

  it('keeps permanent delete for super admins only', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      ArticlesController.prototype.remove,
    ) as string[];
    expect(roles).toEqual(['ADMIN']);
  });

  it('queues translation after create when pending', async () => {
    articles.create.mockResolvedValue({ id: 'art-1', translationStatus: 'PENDING' });
    await controller.create({ titleBg: 'Test' } as never, user);
    expect(translation.enqueue).toHaveBeenCalledWith('art-1');
  });

  it('delegates narrate to tts service', async () => {
    await controller.narrate('art-1', user);
    expect(tts.enqueue).toHaveBeenCalledWith('art-1');
  });
});
