import { Injectable, Logger, NotFoundException, HttpException, HttpStatus } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  ContactInquiry,
  ContactInquiryCategory,
  ContactInquiryStatus,
  Prisma,
} from '@prisma/client'
import { AiService } from '../ai/ai.service'
import { checkRateLimit } from '../common/rate-limit'
import { MailService } from '../mail/mail.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateContactDto } from './dto/create-contact.dto'
import { UpdateContactDto } from './dto/update-contact.dto'

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  private toDto(row: ContactInquiry) {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      subject: row.subject,
      message: row.message,
      status: row.status,
      notes: row.notes,
      aiCategory: row.aiCategory,
      aiSummary: row.aiSummary,
      classifiedAt: row.classifiedAt?.toISOString() ?? null,
      autoRepliedAt: row.autoRepliedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  private categoryLabel(category: ContactInquiryCategory | null) {
    switch (category) {
      case ContactInquiryCategory.BUSINESS:
        return 'Business inquiry'
      case ContactInquiryCategory.STORY_TIP:
        return 'Story tip'
      case ContactInquiryCategory.SPAM:
        return 'Spam'
      case ContactInquiryCategory.GENERAL:
        return 'General question'
      default:
        return 'Unclassified'
    }
  }

  async create(dto: CreateContactDto, meta: { ip?: string } = {}) {
    const ip = meta.ip || 'unknown'
    if (
      !checkRateLimit('contact', `ip:${ip}`, 10, 60 * 60 * 1000) ||
      !checkRateLimit(
        'contact',
        `email:${dto.email.trim().toLowerCase()}`,
        5,
        60 * 60 * 1000,
      )
    ) {
      throw new HttpException(
        'Too many contact requests. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    if (dto.honeypot?.trim()) {
      this.logger.warn('Contact honeypot tripped — dropping submission')
      return { ok: true as const }
    }

    const name = dto.name.trim()
    const email = dto.email.trim().toLowerCase()
    const subject = dto.subject.trim()
    const message = dto.message.trim()

    const classification = await this.ai.classifyContact({
      name,
      email,
      subject,
      message,
    })

    let row = await this.prisma.contactInquiry.create({
      data: {
        name,
        email,
        subject,
        message,
        aiCategory: classification.category as ContactInquiryCategory,
        aiSummary: classification.summary,
        classifiedAt: new Date(),
      },
    })

    await this.notifyAdmin(row).catch((error) => {
      this.logger.warn(
        `Admin contact notify failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    })

    if (row.aiCategory !== ContactInquiryCategory.SPAM) {
      const replied = await this.autoReply(row).catch((error) => {
        this.logger.warn(
          `Contact auto-reply failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
        return false
      })
      if (replied) {
        row = await this.prisma.contactInquiry.update({
          where: { id: row.id },
          data: { autoRepliedAt: new Date() },
        })
      }
    }

    return this.toDto(row)
  }

  private async notifyAdmin(row: ContactInquiry) {
    if (!this.mail.isConfigured()) return
    const admin =
      this.config.get<string>('ADMIN_EMAIL')?.trim() ||
      this.config.get<string>('RESEND_FROM')?.trim()
    if (!admin) return

    const to = admin.includes('<')
      ? admin.replace(/^.*<([^>]+)>.*$/, '$1').trim()
      : admin
    if (!to.includes('@')) return

    const label = this.categoryLabel(row.aiCategory)
    const site =
      this.config.get<string>('PUBLIC_SITE_URL')?.replace(/\/$/, '') ||
      'https://prizni.bg'

    await this.mail.send({
      to,
      subject: `[Prizni contact] ${label}: ${row.subject}`,
      text: [
        `New contact inquiry (${label})`,
        `From: ${row.name} <${row.email}>`,
        `Subject: ${row.subject}`,
        row.aiSummary ? `AI summary: ${row.aiSummary}` : '',
        '',
        row.message,
        '',
        `CMS: ${site}/cms/contact`,
      ]
        .filter(Boolean)
        .join('\n'),
      html: `
        <p><strong>New contact inquiry</strong> — ${label}</p>
        <p>From: ${row.name} &lt;${row.email}&gt;<br/>Subject: ${row.subject}</p>
        ${row.aiSummary ? `<p><em>AI:</em> ${row.aiSummary}</p>` : ''}
        <pre style="white-space:pre-wrap;font-family:sans-serif">${row.message}</pre>
        <p><a href="${site}/cms/contact">Open in CMS</a></p>
      `,
    })
  }

  private async autoReply(row: ContactInquiry): Promise<boolean> {
    if (!this.mail.isConfigured()) return false

    const category = row.aiCategory
    let bodyBg: string
    let bodyEn: string
    if (category === ContactInquiryCategory.BUSINESS) {
      bodyBg =
        'Благодарим ви за запитването. Редакцията на Призни ще прегледа предложението и ще се свърже с вас.'
      bodyEn =
        'Thank you for reaching out. The Prizni desk will review your business inquiry and get back to you.'
    } else if (category === ContactInquiryCategory.STORY_TIP) {
      bodyBg =
        'Благодарим ви за идея за история. Ако е подходяща за журнала, ще се свържем с вас.'
      bodyEn =
        'Thank you for the story tip. If it fits the journal, we will follow up with you.'
    } else {
      bodyBg =
        'Получихме вашето съобщение. Ще отговорим възможно най-скоро.'
      bodyEn =
        'We received your message and will reply as soon as we can.'
    }

    await this.mail.send({
      to: row.email,
      subject: `Prizni · ${row.subject}`,
      text: `Здравейте, ${row.name},\n\n${bodyBg}\n\nHello ${row.name},\n\n${bodyEn}\n\n— Prizni`,
      html: `
        <p>Здравейте, ${row.name},</p>
        <p>${bodyBg}</p>
        <hr/>
        <p>Hello ${row.name},</p>
        <p>${bodyEn}</p>
        <p>— Prizni</p>
      `,
    })
    return true
  }

  async list(
    filters: {
      page?: number
      pageSize?: number
      q?: string
      status?: ContactInquiryStatus
      category?: ContactInquiryCategory
    } = {},
  ) {
    const page = Math.max(1, Number(filters.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 10))

    const where: Prisma.ContactInquiryWhereInput = {}
    if (filters.status) where.status = filters.status
    if (filters.category) where.aiCategory = filters.category
    if (filters.q?.trim()) {
      const q = filters.q.trim()
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { message: { contains: q, mode: 'insensitive' } },
        { aiSummary: { contains: q, mode: 'insensitive' } },
      ]
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.contactInquiry.count({ where }),
      this.prisma.contactInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    return {
      items: rows.map((row) => this.toDto(row)),
      total,
      page,
      pageSize,
      totalPages,
    }
  }

  async getById(id: string) {
    const row = await this.prisma.contactInquiry.findUnique({ where: { id } })
    if (!row) throw new NotFoundException('Contact inquiry not found')
    return this.toDto(row)
  }

  async update(id: string, dto: UpdateContactDto) {
    await this.getById(id)
    const row = await this.prisma.contactInquiry.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes === undefined ? undefined : dto.notes,
      },
    })
    return this.toDto(row)
  }
}
