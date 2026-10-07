import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common'
import * as nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import {
  SettingsService,
  type SmtpSecurity,
} from '../settings/settings.service'

export type SendEmailInput = {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

type SmtpTransportConfig = {
  host: string
  port: number
  user: string | null
  password: string | null
  security: SmtpSecurity
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private client: { fingerprint: string; transporter: Transporter } | null =
    null

  constructor(private readonly settings: SettingsService) {}

  private transportConfig(): SmtpTransportConfig | null {
    if (!this.settings.smtpEnabled()) return null
    const host = this.settings.smtpHost()
    if (!host) return null
    return {
      host,
      port: this.settings.smtpPort(),
      user: this.settings.smtpUser(),
      password: this.settings.smtpPassword(),
      security: this.settings.smtpSecurity(),
    }
  }

  private fingerprint(cfg: SmtpTransportConfig) {
    return [
      cfg.host,
      cfg.port,
      cfg.user ?? '',
      cfg.password ?? '',
      cfg.security,
    ].join('|')
  }

  /** Nodemailer transporter for the current SMTP settings (CMS first, then env). */
  private transporter(): Transporter | null {
    const cfg = this.transportConfig()
    if (!cfg) {
      this.client = null
      return null
    }
    const fingerprint = this.fingerprint(cfg)
    if (this.client?.fingerprint !== fingerprint) {
      const secure = cfg.security === 'ssl'
      this.client = {
        fingerprint,
        transporter: nodemailer.createTransport({
          host: cfg.host,
          port: cfg.port,
          secure,
          ...(cfg.security === 'starttls'
            ? { requireTLS: true }
            : cfg.security === 'none'
              ? { ignoreTLS: true }
              : {}),
          ...(cfg.user
            ? { auth: { user: cfg.user, pass: cfg.password ?? '' } }
            : {}),
        }),
      }
    }
    return this.client.transporter
  }

  isConfigured() {
    return Boolean(this.transporter())
  }

  /** Probe host/port/auth without sending a message. */
  async verifyConnection() {
    const transporter = this.transporter()
    const cfg = this.transportConfig()
    if (!transporter || !cfg) {
      throw new ServiceUnavailableException(
        'Email is not configured. Enable SMTP and set the host in CMS → Settings.',
      )
    }
    try {
      await transporter.verify()
      return {
        ok: true as const,
        host: cfg.host,
        port: cfg.port,
        security: cfg.security,
        user: cfg.user,
        from: this.settings.mailFrom(),
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`SMTP verify failed: ${message}`)
      throw new ServiceUnavailableException(`SMTP connection failed: ${message}`)
    }
  }

  async send(input: SendEmailInput) {
    const transporter = this.transporter()
    if (!transporter) {
      throw new ServiceUnavailableException(
        'Email is not configured. Enable SMTP in CMS → Settings.',
      )
    }

    const to = Array.isArray(input.to) ? input.to : [input.to]
    if (to.length === 0) {
      throw new ServiceUnavailableException('No recipients')
    }

    // One recipient per send so addresses stay private.
    const ids: string[] = []
    for (const recipient of to) {
      try {
        const info = await transporter.sendMail({
          from: this.settings.mailFrom(),
          to: recipient,
          subject: input.subject,
          html: input.html,
          text: input.text,
          ...(input.replyTo ? { replyTo: input.replyTo } : {}),
        })
        if (info.messageId) ids.push(info.messageId)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.logger.error(`SMTP failed for ${recipient}: ${message}`)
        throw new ServiceUnavailableException(`Email send failed: ${message}`)
      }
    }
    return { ids, recipientCount: to.length }
  }

  /** Alert the editorial inbox; silently skipped when email is not set up. */
  async notifyAdmin(input: Omit<SendEmailInput, 'to'>) {
    const to = this.settings.adminNotifyEmail()
    if (!to || !this.isConfigured()) return false
    await this.send({ ...input, to })
    return true
  }
}
