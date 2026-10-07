import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SiteSettings } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import {
  SMTP_SECURITY_VALUES,
  UpdateSiteSettingsDto,
  type SmtpSecurityDto,
} from './dto/update-site-settings.dto';
import { decryptSecret, encryptSecret, maskSecret } from './secret-box';

const SETTINGS_ID = 'default';
const REFRESH_MS = 60_000;
export const DEFAULT_DONATION_PRESETS = [5, 10, 15];
export const DEFAULT_SMTP_PORT = 587;
export const DEFAULT_SMTP_SECURITY: SmtpSecurityDto = 'starttls';
export type SmtpSecurity = SmtpSecurityDto;

type SecretField =
  | 'stripeSecretKeyEnc'
  | 'stripeWebhookSecretEnc'
  | 'smtpPasswordEnc';

export type SecretStatus = {
  configured: boolean;
  source: 'settings' | 'env' | null;
  hint: string | null;
  /** Saved in settings but cannot be decrypted (encryption key changed). */
  unreadable: boolean;
};

function defaults(): SiteSettings {
  return {
    id: SETTINGS_ID,
    facebookUrl: null,
    instagramUrl: null,
    youtubeUrl: null,
    tiktokUrl: null,
    photographerCreditName: null,
    photographerCreditUrl: null,
    shopPublic: false,
    donationPresets: DEFAULT_DONATION_PRESETS,
    stripeSecretKeyEnc: null,
    stripeWebhookSecretEnc: null,
    smtpEnabled: false,
    smtpHost: null,
    smtpPort: null,
    smtpUser: null,
    smtpPasswordEnc: null,
    smtpSecurity: null,
    mailFrom: null,
    mailFromName: null,
    adminNotifyEmail: null,
    notifyAdminOnSubmission: true,
    notifySubmitterOnReceipt: true,
    notifySubmitterOnDecision: true,
    updatedAt: new Date(0),
  };
}

function parseAddressParts(raw: string | null | undefined): {
  email: string;
  name: string;
} {
  const v = raw?.trim() || '';
  if (!v) return { email: '', name: '' };
  const angled = /^(.+?)\s*<([^>]+)>\s*$/.exec(v);
  if (angled) {
    return {
      name: angled[1].replace(/^["']|["']$/g, '').trim(),
      email: angled[2].trim(),
    };
  }
  return { email: v, name: '' };
}

@Injectable()
export class SettingsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SettingsService.name);
  private row: SiteSettings = defaults();
  private timer: NodeJS.Timeout | null = null;
  private stripeClient: { key: string; client: Stripe } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.reload();
    this.timer = setInterval(() => void this.reload(), REFRESH_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Re-read the singleton row (other API instances may have saved). */
  async reload() {
    try {
      const row = await this.prisma.siteSettings.findUnique({
        where: { id: SETTINGS_ID },
      });
      this.row = row ?? defaults();
    } catch (error) {
      this.logger.warn(
        `Could not load site settings, using env/defaults: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return this.row;
  }

  private env(key: string): string | null {
    return this.config.get<string>(key)?.trim() || null;
  }

  private envFlag(key: string): boolean | null {
    const raw = this.env(key)?.toLowerCase();
    if (raw === 'true' || raw === '1') return true;
    if (raw === 'false' || raw === '0') return false;
    return null;
  }

  private encryptionKey(): string | null {
    return (
      this.env('SETTINGS_ENCRYPTION_KEY') || this.env('JWT_ACCESS_SECRET')
    );
  }

  private decrypt(field: SecretField): string | null {
    const payload = this.row[field];
    const key = this.encryptionKey();
    if (!payload || !key) return null;
    return decryptSecret(payload, key);
  }

  private secretStatus(field: SecretField, envKey: string): SecretStatus {
    const saved = this.row[field];
    const fromSettings = this.decrypt(field);
    if (fromSettings) {
      return {
        configured: true,
        source: 'settings',
        hint: maskSecret(fromSettings),
        unreadable: false,
      };
    }
    const fromEnv = this.env(envKey);
    return {
      configured: Boolean(fromEnv),
      source: fromEnv ? 'env' : null,
      hint: maskSecret(fromEnv),
      unreadable: Boolean(saved),
    };
  }

  // ─── Effective values (settings first, env fallback) ─────────────────

  stripeSecretKey(): string | null {
    return this.decrypt('stripeSecretKeyEnc') || this.env('STRIPE_SECRET_KEY');
  }

  stripeWebhookSecret(): string | null {
    return (
      this.decrypt('stripeWebhookSecretEnc') ||
      this.env('STRIPE_WEBHOOK_SECRET')
    );
  }

  /** Stripe dropped BGN after euro adoption — legacy env maps to EUR. */
  stripeCurrency(): string {
    const raw = this.env('STRIPE_CURRENCY')?.toLowerCase() || 'eur';
    return raw === 'bgn' ? 'eur' : raw;
  }

  /** Cached Stripe client; rebuilt automatically when the key changes. */
  stripe(): Stripe | null {
    const key = this.stripeSecretKey();
    if (!key) {
      this.stripeClient = null;
      return null;
    }
    if (this.stripeClient?.key !== key) {
      this.stripeClient = { key, client: new Stripe(key) };
    }
    return this.stripeClient.client;
  }

  smtpEnabled(): boolean {
    if (this.row.smtpEnabled) return true;
    return this.envFlag('SMTP_ENABLED') === true;
  }

  smtpHost(): string | null {
    return this.row.smtpHost?.trim() || this.env('SMTP_HOST');
  }

  smtpPort(): number {
    if (this.row.smtpPort && this.row.smtpPort > 0) return this.row.smtpPort;
    const fromEnv = Number(this.env('SMTP_PORT'));
    if (Number.isInteger(fromEnv) && fromEnv > 0 && fromEnv <= 65535) {
      return fromEnv;
    }
    return DEFAULT_SMTP_PORT;
  }

  smtpUser(): string | null {
    return this.row.smtpUser?.trim() || this.env('SMTP_USER');
  }

  smtpPassword(): string | null {
    return this.decrypt('smtpPasswordEnc') || this.env('SMTP_PASSWORD');
  }

  smtpSecurity(): SmtpSecurity {
    const raw =
      this.row.smtpSecurity?.trim().toLowerCase() ||
      this.env('SMTP_SECURITY')?.toLowerCase() ||
      DEFAULT_SMTP_SECURITY;
    if ((SMTP_SECURITY_VALUES as readonly string[]).includes(raw)) {
      return raw as SmtpSecurity;
    }
    return DEFAULT_SMTP_SECURITY;
  }

  mailFromEmail(): string {
    const fromRow = parseAddressParts(this.row.mailFrom).email;
    if (fromRow) return fromRow;
    const fromEnv =
      this.env('SMTP_FROM') ||
      this.env('RESEND_FROM') ||
      'hello@prizni.bg';
    return parseAddressParts(fromEnv).email || 'hello@prizni.bg';
  }

  mailFromName(): string {
    const fromRow =
      this.row.mailFromName?.trim() ||
      parseAddressParts(this.row.mailFrom).name;
    if (fromRow) return fromRow;
    const fromEnvName = this.env('SMTP_FROM_NAME');
    if (fromEnvName) return fromEnvName;
    const legacy = parseAddressParts(
      this.env('SMTP_FROM') || this.env('RESEND_FROM'),
    ).name;
    return legacy || 'Prizni';
  }

  mailFrom(): string {
    const email = this.mailFromEmail();
    const name = this.mailFromName();
    return name ? `${name} <${email}>` : email;
  }

  /** Inbox for "new submission / contact" alerts. */
  adminNotifyEmail(): string | null {
    const raw =
      this.row.adminNotifyEmail?.trim() ||
      this.env('ADMIN_NOTIFY_EMAIL') ||
      this.env('ADMIN_EMAIL') ||
      this.mailFromEmail();
    const address = raw.includes('<')
      ? raw.replace(/^.*<([^>]+)>.*$/, '$1').trim()
      : raw;
    return address.includes('@') ? address : null;
  }

  notifications() {
    return {
      adminOnSubmission: this.row.notifyAdminOnSubmission,
      submitterOnReceipt: this.row.notifySubmitterOnReceipt,
      submitterOnDecision: this.row.notifySubmitterOnDecision,
    };
  }

  /** FEATURE_SHOP is the server kill switch; shopPublic is the editor toggle. */
  shopPublic(): boolean {
    const flag = this.env('FEATURE_SHOP')?.toLowerCase();
    return (flag === 'true' || flag === '1') && this.row.shopPublic;
  }

  shopFeatureAvailable(): boolean {
    const flag = this.env('FEATURE_SHOP')?.toLowerCase();
    return flag === 'true' || flag === '1';
  }

  donationPresets(): number[] {
    const presets = this.row.donationPresets.filter(
      (n) => Number.isInteger(n) && n > 0,
    );
    return presets.length ? presets : DEFAULT_DONATION_PRESETS;
  }

  siteUrl(): string {
    return (this.env('PUBLIC_SITE_URL') || 'http://localhost:5175').replace(
      /\/+$/,
      '',
    );
  }

  stripeWebhookUrl(): string {
    const prefix = (this.env('API_PREFIX') || 'api').replace(/^\/+|\/+$/g, '');
    return `${this.siteUrl()}/${prefix}/donations/webhook`;
  }

  // ─── API shapes ──────────────────────────────────────────────────────

  getPublic() {
    const r = this.row;
    return {
      social: {
        facebook: r.facebookUrl,
        instagram: r.instagramUrl,
        youtube: r.youtubeUrl,
        tiktok: r.tiktokUrl,
      },
      photographerCredit: r.photographerCreditName
        ? { name: r.photographerCreditName, url: r.photographerCreditUrl }
        : null,
      shopEnabled: this.shopPublic(),
      donations: {
        enabled: Boolean(this.stripeSecretKey()),
        presets: this.donationPresets(),
        currency: 'EUR',
      },
    };
  }

  getCms() {
    const r = this.row;
    const parsedFrom = parseAddressParts(r.mailFrom);
    return {
      facebookUrl: r.facebookUrl ?? '',
      instagramUrl: r.instagramUrl ?? '',
      youtubeUrl: r.youtubeUrl ?? '',
      tiktokUrl: r.tiktokUrl ?? '',
      photographerCreditName: r.photographerCreditName ?? '',
      photographerCreditUrl: r.photographerCreditUrl ?? '',
      shopPublic: r.shopPublic,
      shopFeatureAvailable: this.shopFeatureAvailable(),
      donationPresets: this.donationPresets(),
      stripe: {
        secretKey: this.secretStatus('stripeSecretKeyEnc', 'STRIPE_SECRET_KEY'),
        webhookSecret: this.secretStatus(
          'stripeWebhookSecretEnc',
          'STRIPE_WEBHOOK_SECRET',
        ),
        webhookUrl: this.stripeWebhookUrl(),
        currency: this.stripeCurrency().toUpperCase(),
        mode: this.stripeSecretKey()?.startsWith('sk_live_')
          ? 'live'
          : this.stripeSecretKey()
            ? 'test'
            : null,
      },
      email: {
        enabled: r.smtpEnabled,
        enabledEffective: this.smtpEnabled(),
        host: r.smtpHost ?? '',
        hostEffective: this.smtpHost(),
        port: r.smtpPort,
        portEffective: this.smtpPort(),
        user: r.smtpUser ?? '',
        userEffective: this.smtpUser(),
        password: this.secretStatus('smtpPasswordEnc', 'SMTP_PASSWORD'),
        security: (r.smtpSecurity as SmtpSecurity | null) ?? '',
        securityEffective: this.smtpSecurity(),
        mailFrom: parsedFrom.email || (r.mailFrom ?? ''),
        mailFromName: r.mailFromName ?? parsedFrom.name,
        mailFromEffective: this.mailFrom(),
        adminNotifyEmail: r.adminNotifyEmail ?? '',
        adminNotifyEmailEffective: this.adminNotifyEmail(),
        notifyAdminOnSubmission: r.notifyAdminOnSubmission,
        notifySubmitterOnReceipt: r.notifySubmitterOnReceipt,
        notifySubmitterOnDecision: r.notifySubmitterOnDecision,
        configured: Boolean(this.smtpEnabled() && this.smtpHost()),
      },
      updatedAt: r.updatedAt.getTime() > 0 ? r.updatedAt.toISOString() : null,
    };
  }

  // ─── Update ──────────────────────────────────────────────────────────

  private cleanUrl(value: string | undefined, label: string) {
    if (value === undefined) return undefined;
    const v = value.trim();
    if (!v) return null;
    const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
      const url = new URL(withScheme);
      if (!url.hostname.includes('.')) throw new Error('host');
      return url.toString();
    } catch {
      throw new BadRequestException(`${label}: enter a full link, e.g. https://…`);
    }
  }

  private cleanText(value: string | undefined) {
    if (value === undefined) return undefined;
    return value.trim() || null;
  }

  private cleanEmail(value: string | undefined, label: string) {
    const v = this.cleanText(value);
    if (!v) return v;
    const address = v.includes('<') ? v.replace(/^.*<([^>]+)>.*$/, '$1') : v;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.trim())) {
      throw new BadRequestException(`${label}: not a valid email address`);
    }
    return address.trim();
  }

  private cleanHost(value: string | undefined, label: string) {
    const v = this.cleanText(value);
    if (!v) return v;
    if (/\s/.test(v) || v.includes('://')) {
      throw new BadRequestException(
        `${label}: enter a hostname only (e.g. mail.example.com)`,
      );
    }
    return v;
  }

  private sealSecret(
    value: string | undefined,
    label: string,
    prefixes: string[],
    hint: string,
  ) {
    if (value === undefined) return undefined;
    const v = value.trim();
    if (!v) return null;
    if (v.startsWith('pk_')) {
      throw new BadRequestException(
        `${label}: this is the publishable key. Paste the secret key (sk_live_… / sk_test_…).`,
      );
    }
    if (!prefixes.some((p) => v.startsWith(p))) {
      throw new BadRequestException(`${label}: expected a key starting with ${hint}`);
    }
    return this.encryptPlain(v, label);
  }

  private sealPlainSecret(value: string | undefined, label: string) {
    if (value === undefined) return undefined;
    const v = value.trim();
    if (!v) return null;
    return this.encryptPlain(v, label);
  }

  private encryptPlain(value: string, label: string) {
    const key = this.encryptionKey();
    if (!key) {
      throw new ServiceUnavailableException(
        'Set SETTINGS_ENCRYPTION_KEY (or JWT_ACCESS_SECRET) before saving secrets.',
      );
    }
    void label;
    return encryptSecret(value, key);
  }

  async update(dto: UpdateSiteSettingsDto) {
    if (dto.smtpPort === null) {
      // explicit clear
    } else if (dto.smtpPort !== undefined) {
      if (!Number.isInteger(dto.smtpPort) || dto.smtpPort < 1 || dto.smtpPort > 65535) {
        throw new BadRequestException('SMTP port: enter a number between 1 and 65535');
      }
    }

    const data = {
      facebookUrl: this.cleanUrl(dto.facebookUrl, 'Facebook'),
      instagramUrl: this.cleanUrl(dto.instagramUrl, 'Instagram'),
      youtubeUrl: this.cleanUrl(dto.youtubeUrl, 'YouTube'),
      tiktokUrl: this.cleanUrl(dto.tiktokUrl, 'TikTok'),
      photographerCreditName: this.cleanText(dto.photographerCreditName),
      photographerCreditUrl: this.cleanUrl(
        dto.photographerCreditUrl,
        'Photographer link',
      ),
      shopPublic: dto.shopPublic,
      donationPresets: dto.donationPresets
        ? [...new Set(dto.donationPresets)].sort((a, b) => a - b)
        : undefined,
      stripeSecretKeyEnc: this.sealSecret(
        dto.stripeSecretKey,
        'Stripe secret key',
        ['sk_', 'rk_'],
        'sk_live_ or sk_test_',
      ),
      stripeWebhookSecretEnc: this.sealSecret(
        dto.stripeWebhookSecret,
        'Stripe webhook secret',
        ['whsec_'],
        'whsec_',
      ),
      smtpEnabled: dto.smtpEnabled,
      smtpHost: this.cleanHost(dto.smtpHost, 'SMTP host'),
      smtpPort:
        dto.smtpPort === undefined
          ? undefined
          : dto.smtpPort === null
            ? null
            : dto.smtpPort,
      smtpUser: this.cleanText(dto.smtpUser),
      smtpPasswordEnc: this.sealPlainSecret(dto.smtpPassword, 'SMTP password'),
      smtpSecurity:
        dto.smtpSecurity === undefined
          ? undefined
          : dto.smtpSecurity || null,
      mailFrom: this.cleanEmail(dto.mailFrom, 'From email'),
      mailFromName: this.cleanText(dto.mailFromName),
      adminNotifyEmail: this.cleanEmail(dto.adminNotifyEmail, 'Admin inbox'),
      notifyAdminOnSubmission: dto.notifyAdminOnSubmission,
      notifySubmitterOnReceipt: dto.notifySubmitterOnReceipt,
      notifySubmitterOnDecision: dto.notifySubmitterOnDecision,
    };

    this.row = await this.prisma.siteSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...data },
      update: data,
    });
    return this.getCms();
  }

  /** Verify the saved Stripe key by reading the connected account. */
  async testStripe() {
    const stripe = this.stripe();
    if (!stripe) {
      throw new ServiceUnavailableException('No Stripe secret key saved yet.');
    }
    try {
      const account = await stripe.accounts.retrieveCurrent();
      return {
        ok: true as const,
        mode: this.stripeSecretKey()?.startsWith('sk_live_') ? 'live' : 'test',
        accountId: account.id,
        accountName:
          account.business_profile?.name ||
          account.settings?.dashboard?.display_name ||
          null,
        email: account.email ?? null,
        chargesEnabled: account.charges_enabled ?? false,
        webhookConfigured: Boolean(this.stripeWebhookSecret()),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(`Stripe rejected the key: ${message}`);
    }
  }
}
