import { createSettings } from '../../test/helpers/mocks';

describe('SettingsService SMTP config', () => {
  it('is disabled by default on a fresh install', () => {
    const settings = createSettings({});
    expect(settings.smtpEnabled()).toBe(false);
    expect(settings.smtpHost()).toBeNull();
    expect(settings.getCms().email.configured).toBe(false);
  });

  it('reads CMS SMTP fields once an admin saves them', () => {
    const settings = createSettings(
      {},
      {
        smtpEnabled: true,
        smtpHost: 'mail.company.bg',
        smtpPort: 587,
        smtpUser: 'smtp-user',
        smtpSecurity: 'starttls',
        mailFrom: 'hello@prizni.bg',
        mailFromName: 'Prizni',
        adminNotifyEmail: 'editors@prizni.bg',
      },
    );

    expect(settings.smtpEnabled()).toBe(true);
    expect(settings.smtpHost()).toBe('mail.company.bg');
    expect(settings.smtpPort()).toBe(587);
    expect(settings.smtpUser()).toBe('smtp-user');
    expect(settings.smtpSecurity()).toBe('starttls');
    expect(settings.mailFrom()).toBe('Prizni <hello@prizni.bg>');
    expect(settings.adminNotifyEmail()).toBe('editors@prizni.bg');
    expect(settings.getCms().email).toMatchObject({
      enabled: true,
      configured: true,
      host: 'mail.company.bg',
      mailFrom: 'hello@prizni.bg',
      mailFromName: 'Prizni',
      mailFromEffective: 'Prizni <hello@prizni.bg>',
    });
  });

  it('falls back to SMTP_* env when CMS fields are empty', () => {
    const settings = createSettings({
      SMTP_ENABLED: 'true',
      SMTP_HOST: 'smtp.env.example',
      SMTP_PORT: '465',
      SMTP_USER: 'env-user',
      SMTP_PASSWORD: 'secret',
      SMTP_SECURITY: 'ssl',
      SMTP_FROM: 'news@prizni.bg',
      SMTP_FROM_NAME: 'Prizni News',
      ADMIN_NOTIFY_EMAIL: 'desk@prizni.bg',
    });

    expect(settings.smtpEnabled()).toBe(true);
    expect(settings.smtpHost()).toBe('smtp.env.example');
    expect(settings.smtpPort()).toBe(465);
    expect(settings.smtpUser()).toBe('env-user');
    expect(settings.smtpPassword()).toBe('secret');
    expect(settings.smtpSecurity()).toBe('ssl');
    expect(settings.mailFrom()).toBe('Prizni News <news@prizni.bg>');
    expect(settings.adminNotifyEmail()).toBe('desk@prizni.bg');
    expect(settings.getCms().email.configured).toBe(true);
  });

  it('prefers CMS values over env when both are set', () => {
    const settings = createSettings(
      {
        SMTP_ENABLED: 'true',
        SMTP_HOST: 'env.example',
        SMTP_FROM: 'env@prizni.bg',
        SMTP_FROM_NAME: 'Env',
      },
      {
        smtpEnabled: true,
        smtpHost: 'cms.example',
        mailFrom: 'cms@prizni.bg',
        mailFromName: 'CMS',
      },
    );

    expect(settings.smtpHost()).toBe('cms.example');
    expect(settings.mailFrom()).toBe('CMS <cms@prizni.bg>');
  });

  it('parses a legacy Name <email> mailFrom into separate fields', () => {
    const settings = createSettings(
      {},
      { mailFrom: 'Prizni <hello@prizni.bg>' },
    );
    const email = settings.getCms().email;
    expect(email.mailFrom).toBe('hello@prizni.bg');
    expect(email.mailFromName).toBe('Prizni');
  });

  it('defaults port to 587 and security to starttls', () => {
    const settings = createSettings({}, { smtpEnabled: true, smtpHost: 'x' });
    expect(settings.smtpPort()).toBe(587);
    expect(settings.smtpSecurity()).toBe('starttls');
  });
});
