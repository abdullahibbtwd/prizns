import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ArticlesService } from '../articles/articles.service';
import { AuthorsService } from '../authors/authors.service';
import { MailService } from '../mail/mail.service';
import { SettingsService } from '../settings/settings.service';
import { createMockPrisma, createSettings } from '../../test/helpers/mocks';
import { SubmissionsService } from './submissions.service';

describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let prisma: ReturnType<typeof createMockPrisma>;
  const storage = { upload: jest.fn() };
  const articles = { create: jest.fn() };
  const mail = {
    isConfigured: jest.fn().mockReturnValue(true),
    send: jest.fn().mockResolvedValue({ ids: ['e'], recipientCount: 1 }),
    notifyAdmin: jest.fn().mockResolvedValue(true),
  };

  const row = {
    id: 'sub-1',
    name: 'Contributor',
    email: 'c@example.com',
    phone: null,
    place: 'Vidin',
    title: 'My story',
    category: 'Human Stories',
    description: 'Desc',
    story: 'Story text',
    links: null,
    ownWork: true,
    status: SubmissionStatus.NEW,
    notes: null,
    articleId: null,
    photoUrls: [],
    documentUrls: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const authors = {
    findOrCreateGuest: jest.fn().mockResolvedValue({ id: 'guest-1' }),
  };

  beforeEach(async () => {
    prisma = createMockPrisma({
      submission: {
        create: jest.fn().mockResolvedValue(row),
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([row]),
        findUnique: jest.fn().mockResolvedValue(row),
        update: jest.fn().mockResolvedValue(row),
        delete: jest.fn().mockResolvedValue(row),
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        { provide: ArticlesService, useValue: articles },
        { provide: MailService, useValue: mail },
        { provide: AuthorsService, useValue: authors },
        {
          provide: SettingsService,
          useValue: createSettings({ PUBLIC_SITE_URL: 'https://prizni.bg' }),
        },
      ],
    }).compile();

    service = module.get(SubmissionsService);
  });

  it('creates submission', async () => {
    const created = await service.create({
      name: 'Contributor',
      email: 'c@example.com',
      place: 'Vidin',
      title: 'My story',
      category: 'Human Stories',
      description: 'Short description',
      story: 'Story text',
      ownWork: true,
    });
    expect(created.id).toBe('sub-1');
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'c@example.com' }),
    );
    expect(mail.notifyAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ replyTo: 'c@example.com' }),
    );
  });

  it('emails the writer when the story is approved', async () => {
    mail.send.mockClear();
    prisma.submission.update = jest
      .fn()
      .mockResolvedValue({ ...row, status: SubmissionStatus.APPROVED });
    await service.update('sub-1', { status: SubmissionStatus.APPROVED });
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'c@example.com' }),
    );
  });

  it('does not email when the editor opts out', async () => {
    mail.send.mockClear();
    prisma.submission.update = jest
      .fn()
      .mockResolvedValue({ ...row, status: SubmissionStatus.APPROVED });
    await service.update('sub-1', {
      status: SubmissionStatus.APPROVED,
      notifySubmitter: false,
    });
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('sends an editor reply and logs it in notes', async () => {
    mail.send.mockClear();
    await service.reply('sub-1', { message: 'Can you send more photos?' });
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'c@example.com',
        text: expect.stringContaining('Can you send more photos?'),
      }),
    );
    expect(prisma.submission.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: { notes: expect.stringContaining('Can you send more photos?') },
      }),
    );
  });

  it('lists submissions', async () => {
    const result = await service.list({ page: 1 });
    expect(result.items).toHaveLength(1);
  });

  it('throws when submission missing', async () => {
    prisma.submission.findUnique = jest.fn().mockResolvedValue(null);
    await expect(service.getById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('credits the draft to a guest author when a submission is approved', async () => {
    articles.create.mockResolvedValue({ id: 'art-9' });
    await service.convertToDraft('sub-1');
    expect(authors.findOrCreateGuest).toHaveBeenCalledWith('Contributor');
    expect(articles.create).toHaveBeenCalledWith(
      expect.objectContaining({ authorId: 'guest-1' }),
    );
  });
});
