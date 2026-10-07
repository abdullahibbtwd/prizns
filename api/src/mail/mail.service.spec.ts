import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { createSettings } from '../../test/helpers/mocks';
import { SettingsService } from '../settings/settings.service';
import { MailService } from './mail.service';

const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'email-1' });
const mockVerify = jest.fn().mockResolvedValue(true);

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockImplementation(() => ({
    sendMail: mockSendMail,
    verify: mockVerify,
  })),
}));

const createTransport = nodemailer.createTransport as jest.Mock;

async function build(settings: SettingsService) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [MailService, { provide: SettingsService, useValue: settings }],
  }).compile();
  return module.get(MailService);
}

/** CMS SMTP values as an admin would save them in Settings. */
function cmsSmtp(overrides: Record<string, unknown> = {}) {
  return createSettings(
    {},
    {
      smtpEnabled: true,
      smtpHost: 'mail.company.bg',
      smtpPort: 587,
      smtpUser: 'noreply@prizni.bg',
      smtpSecurity: 'starttls',
      mailFrom: 'hello@prizni.bg',
      mailFromName: 'Prizni',
      adminNotifyEmail: 'editors@prizni.bg',
      ...overrides,
    },
  );
}

describe('MailService', () => {
  beforeEach(() => {
    mockSendMail.mockClear();
    mockVerify.mockClear();
    createTransport.mockClear();
  });

  it('reports unconfigured when SMTP is disabled', async () => {
    const service = await build(
      createSettings(
        { SMTP_FROM: 'Prizni <hello@prizni.bg>' },
        { smtpHost: 'mail.example.com', smtpEnabled: false },
      ),
    );
    expect(service.isConfigured()).toBe(false);
    await expect(
      service.send({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(createTransport).not.toHaveBeenCalled();
  });

  it('becomes configured once CMS SMTP settings are saved', async () => {
    const service = await build(cmsSmtp());
    expect(service.isConfigured()).toBe(true);
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'mail.company.bg',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: { user: 'noreply@prizni.bg', pass: '' },
      }),
    );
  });

  it('uses env SMTP fallback when CMS has no host but SMTP_ENABLED is set', async () => {
    const service = await build(
      createSettings({
        SMTP_ENABLED: 'true',
        SMTP_HOST: 'smtp.env.example',
        SMTP_PORT: '465',
        SMTP_USER: 'env-user',
        SMTP_PASSWORD: 'env-pass',
        SMTP_SECURITY: 'ssl',
        SMTP_FROM: 'hello@prizni.bg',
        SMTP_FROM_NAME: 'Prizni',
      }),
    );
    expect(service.isConfigured()).toBe(true);
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.env.example',
        port: 465,
        secure: true,
        auth: { user: 'env-user', pass: 'env-pass' },
      }),
    );
  });

  it('sends email with the configured From when SMTP is set up', async () => {
    const service = await build(cmsSmtp());
    await expect(
      service.send({
        to: 'reader@example.com',
        subject: 'Hello',
        html: '<p>Hi</p>',
        text: 'Hi',
      }),
    ).resolves.toEqual({ ids: ['email-1'], recipientCount: 1 });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Prizni <hello@prizni.bg>',
        to: 'reader@example.com',
        subject: 'Hello',
        html: '<p>Hi</p>',
        text: 'Hi',
      }),
    );
  });

  it('uses the sender saved in CMS settings over env', async () => {
    const service = await build(
      createSettings(
        {
          SMTP_FROM: 'Env <env@prizni.bg>',
          SMTP_ENABLED: 'true',
          SMTP_HOST: 'env.example.com',
        },
        {
          smtpEnabled: true,
          smtpHost: 'mail.example.com',
          mailFrom: 'news@prizni.bg',
          mailFromName: 'Prizni',
        },
      ),
    );
    await service.send({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' });
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'Prizni <news@prizni.bg>' }),
    );
  });

  it('sends admin alerts to the inbox saved in settings', async () => {
    const service = await build(cmsSmtp());
    await expect(
      service.notifyAdmin({ subject: 'New', text: 'x', html: '<p>x</p>' }),
    ).resolves.toBe(true);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'editors@prizni.bg' }),
    );
  });

  it('skips admin alerts when email is not configured', async () => {
    const service = await build(createSettings({}));
    await expect(
      service.notifyAdmin({ subject: 'New', text: 'x', html: '<p>x</p>' }),
    ).resolves.toBe(false);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('verifies the SMTP connection when configured', async () => {
    const service = await build(cmsSmtp());
    await expect(service.verifyConnection()).resolves.toMatchObject({
      ok: true,
      host: 'mail.company.bg',
      port: 587,
      security: 'starttls',
      from: 'Prizni <hello@prizni.bg>',
    });
    expect(mockVerify).toHaveBeenCalled();
  });

  it('surfaces SMTP verify failures so admins know the config is wrong', async () => {
    mockVerify.mockRejectedValueOnce(new Error('Invalid login'));
    const service = await build(cmsSmtp());
    await expect(service.verifyConnection()).rejects.toThrow(/Invalid login/);
  });

  it('surfaces SMTP send failures with the server message', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('relay denied'));
    const service = await build(cmsSmtp());
    await expect(
      service.send({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' }),
    ).rejects.toThrow(/relay denied/);
  });

  it('builds SSL transport for port-465 style security', async () => {
    const service = await build(
      cmsSmtp({ smtpPort: 465, smtpSecurity: 'ssl' }),
    );
    expect(service.isConfigured()).toBe(true);
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'mail.company.bg',
        port: 465,
        secure: true,
      }),
    );
  });
});
