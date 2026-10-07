import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MailService } from '../mail/mail.service';
import { overrideGuards } from '../../test/helpers/guards';
import { mockAuthUser } from '../../test/helpers/mocks';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

describe('SettingsController email test', () => {
  let controller: SettingsController;
  const settings = {
    reload: jest.fn(),
    getCms: jest.fn(),
    update: jest.fn(),
    testStripe: jest.fn(),
    mailFrom: jest.fn().mockReturnValue('Prizni <hello@prizni.bg>'),
  };
  const mail = {
    verifyConnection: jest.fn(),
    send: jest.fn(),
  };

  beforeEach(async () => {
    mail.verifyConnection.mockReset().mockResolvedValue({
      ok: true,
      host: 'mail.company.bg',
      port: 587,
      security: 'starttls',
      user: 'noreply@prizni.bg',
      from: 'Prizni <hello@prizni.bg>',
    });
    mail.send.mockReset().mockResolvedValue({ ids: ['m-1'], recipientCount: 1 });

    const builder = Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        { provide: SettingsService, useValue: settings },
        { provide: MailService, useValue: mail },
      ],
    });
    overrideGuards(builder, JwtAuthGuard, RolesGuard);
    const module: TestingModule = await builder.compile();
    controller = module.get(SettingsController);
  });

  it('verifies SMTP then sends a test email when config is present', async () => {
    const result = await controller.testEmail(
      { to: 'admin@prizni.bg' },
      mockAuthUser,
    );

    expect(mail.verifyConnection).toHaveBeenCalled();
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@prizni.bg',
        subject: 'Prizni · test email',
      }),
    );
    expect(result).toEqual({
      ok: true,
      to: 'admin@prizni.bg',
      from: 'Prizni <hello@prizni.bg>',
      host: 'mail.company.bg',
      port: 587,
      security: 'starttls',
    });
  });

  it('defaults the test recipient to the signed-in admin', async () => {
    await controller.testEmail({}, mockAuthUser);
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: mockAuthUser.email }),
    );
  });

  it('does not send when SMTP verify fails', async () => {
    mail.verifyConnection.mockRejectedValueOnce(
      new Error('SMTP connection failed: Invalid login'),
    );
    await expect(controller.testEmail({}, mockAuthUser)).rejects.toThrow(
      /Invalid login/,
    );
    expect(mail.send).not.toHaveBeenCalled();
  });
});
