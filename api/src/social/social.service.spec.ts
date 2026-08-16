import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ArticleStatus, SocialPostStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { createMockConfig, createMockPrisma } from '../../test/helpers/mocks';
import { SocialService } from './social.service';

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              FACEBOOK: { body: 'Story on Prizni', hashtags: '#prizni' },
              INSTAGRAM: { body: 'Photo story', hashtags: '#bg' },
            }),
        },
      }),
    }),
  })),
}));

describe('SocialService', () => {
  let service: SocialService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma({
      socialWorkspaceSettings: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'default',
          platforms: ['FACEBOOK', 'INSTAGRAM'],
        }),
        upsert: jest.fn().mockResolvedValue({
          id: 'default',
          platforms: ['FACEBOOK', 'INSTAGRAM'],
        }),
        create: jest.fn(),
      },
      socialPost: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
      },
      article: {
        findUnique: jest.fn(),
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: createMockConfig({
            FEATURE_SOCIAL: 'true',
            FEATURE_AI: 'true',
            GEMINI_API_KEY: 'test-key',
          }),
        },
      ],
    }).compile();

    service = module.get(SocialService);
  });

  it('returns platform catalog', () => {
    const catalog = service.catalog();
    expect(catalog.length).toBeGreaterThan(0);
    expect(catalog[0]).toHaveProperty('code');
  });

  it('loads platform settings', async () => {
    const settings = await service.getPlatformSettings();
    expect(settings.platforms).toContain('FACEBOOK');
  });

  it('rejects unknown platforms on save', async () => {
    await expect(
      service.savePlatformSettings({ platforms: ['NOT_A_PLATFORM'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects empty platform list', async () => {
    await expect(
      service.savePlatformSettings({ platforms: [] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists social posts with filters', async () => {
    prisma.socialPost.findMany = jest.fn().mockResolvedValue([
      {
        id: 'post-1',
        articleId: 'art-1',
        platform: 'FACEBOOK',
        status: SocialPostStatus.DRAFT,
        body: 'Draft copy',
        hashtags: '#prizni',
        promptVersion: 'v1',
        scheduledAt: null,
        publishedAt: null,
        externalId: null,
        error: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        article: {
          id: 'art-1',
          titleBg: 'Story',
          titleEn: 'Story',
          path: '/stories/story',
          section: 'stories',
          status: ArticleStatus.PUBLISHED,
          slug: 'story',
        },
      },
    ]);

    const rows = await service.list({ status: 'DRAFT', articleId: 'art-1' });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.platform).toBe('FACEBOOK');
  });

  it('updates, approves, and removes a social post', async () => {
    const row = {
      id: 'post-1',
      articleId: 'art-1',
      platform: 'FACEBOOK',
      status: SocialPostStatus.DRAFT,
      body: 'Old',
      hashtags: '',
      promptVersion: null,
      scheduledAt: null,
      publishedAt: null,
      externalId: null,
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      article: {
        id: 'art-1',
        titleBg: 'Story',
        titleEn: 'Story',
        path: '/stories/story',
        section: 'stories',
        status: ArticleStatus.PUBLISHED,
        slug: 'story',
      },
    };
    prisma.socialPost.findUnique = jest.fn().mockResolvedValue(row);
    prisma.socialPost.update = jest.fn().mockResolvedValue({
      ...row,
      body: 'Updated',
      status: SocialPostStatus.APPROVED,
    });
    prisma.socialPost.delete = jest.fn().mockResolvedValue(row);

    const updated = await service.update('post-1', { body: 'Updated' });
    expect(updated.body).toBe('Updated');

    const approved = await service.approve('post-1');
    expect(approved.status).toBe(SocialPostStatus.APPROVED);

    const removed = await service.remove('post-1');
    expect(removed).toEqual({ ok: true, id: 'post-1' });
  });

  it('generates platform copy for a published article', async () => {
    prisma.article.findUnique = jest.fn().mockResolvedValue({
      id: 'art-1',
      status: ArticleStatus.PUBLISHED,
      titleBg: 'История',
      subtitleBg: 'Подзаглавие',
      path: '/stories/story',
      body: [{ type: 'paragraph', textBg: 'Текст на историята.' }],
    });
    prisma.socialPost.upsert = jest.fn().mockImplementation(({ create }) =>
      Promise.resolve({
        ...create,
        id: 'post-new',
        createdAt: new Date(),
        updatedAt: new Date(),
        article: {
          id: 'art-1',
          titleBg: 'История',
          titleEn: 'Story',
          path: '/stories/story',
          section: 'stories',
          status: ArticleStatus.PUBLISHED,
          slug: 'story',
        },
      }),
    );

    const saved = await service.generate({ articleId: 'art-1' });
    expect(saved.length).toBeGreaterThan(0);
    expect(prisma.socialPost.upsert).toHaveBeenCalled();
  });

  it('rejects generate when social feature is disabled', async () => {
    const disabled = new SocialService(
      prisma as never,
      createMockConfig({ FEATURE_SOCIAL: 'false', FEATURE_AI: 'true' }) as never,
    );
    await expect(
      disabled.generate({ articleId: 'art-1' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
