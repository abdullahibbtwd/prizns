import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import {
  ContactInquiryCategory,
  ContactInquiryStatus,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { MailService } from '../mail/mail.service';
import { createMockConfig, createMockPrisma } from '../../test/helpers/mocks';
import { ContactService } from './contact.service';

describe('ContactService', () => {
  let service: ContactService;
  let prisma: ReturnType<typeof createMockPrisma>;
  const ai = {
    classifyContact: jest.fn().mockResolvedValue({
      category: 'GENERAL',
      summary: 'General question',
    }),
  };
  const mail = { isConfigured: jest.fn().mockReturnValue(false), send: jest.fn() };

  const row = {
    id: 'inq-1',
    name: 'Reader',
    email: 'reader@example.com',
    subject: 'Hello',
    message: 'Question',
    status: ContactInquiryStatus.NEW,
    notes: null,
    aiCategory: ContactInquiryCategory.GENERAL,
    aiSummary: 'General question',
    classifiedAt: new Date(),
    autoRepliedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = createMockPrisma({
      contactInquiry: {
        create: jest.fn().mockResolvedValue(row),
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([row]),
        findUnique: jest.fn().mockResolvedValue(row),
        update: jest.fn().mockResolvedValue(row),
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiService, useValue: ai },
        { provide: MailService, useValue: mail },
        { provide: ConfigService, useValue: createMockConfig({}) },
      ],
    }).compile();

    service = module.get(ContactService);
  });

  it('drops honeypot submissions silently', async () => {
    const result = await service.create({
      name: 'Bot',
      email: 'bot@example.com',
      subject: 'Spam',
      message: 'Buy',
      honeypot: 'filled',
    });
    expect(result).toEqual({ ok: true });
    expect(prisma.contactInquiry.create).not.toHaveBeenCalled();
  });

  it('creates classified inquiry', async () => {
    const result = await service.create({
      name: 'Reader',
      email: 'reader@example.com',
      subject: 'Hello',
      message: 'Question',
    });
    expect(result.id).toBe('inq-1');
    expect(ai.classifyContact).toHaveBeenCalled();
  });

  it('lists inquiries', async () => {
    const result = await service.list({ page: 1 });
    expect(result.items).toHaveLength(1);
  });

  it('throws when inquiry missing', async () => {
    prisma.contactInquiry.findUnique = jest.fn().mockResolvedValue(null);
    await expect(service.getById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
