import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createMockConfig } from '../../test/helpers/mocks';
import { MailService } from './mail.service';

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null }),
    },
  })),
}));

describe('MailService', () => {
  it('reports unconfigured when RESEND_API_KEY is missing', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: createMockConfig({ RESEND_FROM: 'Prizni <hello@prizni.bg>' }),
        },
      ],
    }).compile();

    const service = module.get(MailService);
    expect(service.isConfigured()).toBe(false);
    await expect(
      service.send({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('sends email when configured', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: createMockConfig({
            RESEND_API_KEY: 're_test',
            RESEND_FROM: 'Prizni <hello@prizni.bg>',
          }),
        },
      ],
    }).compile();

    const service = module.get(MailService);
    expect(service.isConfigured()).toBe(true);
    await expect(
      service.send({ to: 'reader@example.com', subject: 'Hello', html: '<p>Hi</p>' }),
    ).resolves.toEqual({ ids: ['email-1'], recipientCount: 1 });
  });
});
