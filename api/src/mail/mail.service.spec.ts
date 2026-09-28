import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { createSettings } from '../../test/helpers/mocks';
import { SettingsService } from '../settings/settings.service';
import { MailService } from './mail.service';

const mockSend = jest
  .fn()
  .mockResolvedValue({ data: { id: 'email-1' }, error: null });

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

async function build(settings: SettingsService) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [MailService, { provide: SettingsService, useValue: settings }],
  }).compile();
  return module.get(MailService);
}

describe('MailService', () => {
  beforeEach(() => mockSend.mockClear());

  it('reports unconfigured when RESEND_API_KEY is missing', async () => {
    const service = await build(
      createSettings({ RESEND_FROM: 'Prizni <hello@prizni.bg>' }),
    );
    expect(service.isConfigured()).toBe(false);
    await expect(
      service.send({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('sends email when configured', async () => {
    const service = await build(
      createSettings({
        RESEND_API_KEY: 're_test',
        RESEND_FROM: 'Prizni <hello@prizni.bg>',
      }),
    );
    expect(service.isConfigured()).toBe(true);
    await expect(
      service.send({ to: 'reader@example.com', subject: 'Hello', html: '<p>Hi</p>' }),
    ).resolves.toEqual({ ids: ['email-1'], recipientCount: 1 });
  });

  it('uses the sender saved in CMS settings over env', async () => {
    const service = await build(
      createSettings(
        { RESEND_API_KEY: 're_test', RESEND_FROM: 'Env <env@prizni.bg>' },
        { mailFrom: 'Prizni <news@prizni.bg>' },
      ),
    );
    await service.send({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'Prizni <news@prizni.bg>' }),
    );
  });

  it('sends admin alerts to the inbox saved in settings', async () => {
    const service = await build(
      createSettings(
        { RESEND_API_KEY: 're_test' },
        { adminNotifyEmail: 'editors@prizni.bg' },
      ),
    );
    await expect(
      service.notifyAdmin({ subject: 'New', text: 'x', html: '<p>x</p>' }),
    ).resolves.toBe(true);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'editors@prizni.bg' }),
    );
  });

  it('skips admin alerts when email is not configured', async () => {
    const service = await build(createSettings({}));
    await expect(
      service.notifyAdmin({ subject: 'New', text: 'x', html: '<p>x</p>' }),
    ).resolves.toBe(false);
    expect(mockSend).not.toHaveBeenCalled();
  });
});
