import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Resend } from 'resend'

export type SendEmailInput = {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private readonly resend: Resend | null
  private readonly from: string

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY')?.trim()
    this.from =
      this.config.get<string>('RESEND_FROM')?.trim() ||
      'Prizni <hello@prizni.bg>'
    this.resend = apiKey ? new Resend(apiKey) : null
  }

  isConfigured() {
    return Boolean(this.resend)
  }

  async send(input: SendEmailInput) {
    if (!this.resend) {
      throw new ServiceUnavailableException(
        'RESEND_API_KEY is not configured',
      )
    }

    const to = Array.isArray(input.to) ? input.to : [input.to]
    if (to.length === 0) {
      throw new ServiceUnavailableException('No recipients')
    }

    // One recipient per send so addresses stay private.
    const ids: string[] = []
    for (const recipient of to) {
      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to: recipient,
        subject: input.subject,
        html: input.html,
        text: input.text,
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
}
