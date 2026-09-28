import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common'
import { Resend } from 'resend'
import { SettingsService } from '../settings/settings.service'

export type SendEmailInput = {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private client: { key: string; resend: Resend } | null = null

  constructor(private readonly settings: SettingsService) {}

  /** Resend client for the current key (CMS Settings first, then env). */
  private resend(): Resend | null {
    const key = this.settings.resendApiKey()
    if (!key) {
      this.client = null
      return null
    }
    if (this.client?.key !== key) {
      this.client = { key, resend: new Resend(key) }
    }
    return this.client.resend
  }

  isConfigured() {
    return Boolean(this.resend())
  }

  async send(input: SendEmailInput) {
    const resend = this.resend()
    if (!resend) {
      throw new ServiceUnavailableException(
        'Email is not configured. Add a Resend API key in CMS → Settings.',
      )
    }

    const to = Array.isArray(input.to) ? input.to : [input.to]
    if (to.length === 0) {
      throw new ServiceUnavailableException('No recipients')
    }

    // One recipient per send so addresses stay private.
    const ids: string[] = []
    for (const recipient of to) {
      const { data, error } = await resend.emails.send({
        from: this.settings.mailFrom(),
        to: recipient,
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      })
      if (error) {
        this.logger.error(`Resend failed for ${recipient}: ${error.message}`)
        throw new ServiceUnavailableException(
          `Email send failed: ${error.message}`,
        )
      }
      if (data?.id) ids.push(data.id)
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
