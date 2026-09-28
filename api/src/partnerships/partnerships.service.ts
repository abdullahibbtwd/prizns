import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PartnershipInquiry, PartnershipStatus, Prisma } from '@prisma/client';
import { escapeHtml, textToHtml } from '../mail/email-html';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CreatePartnershipDto } from './dto/create-partnership.dto';
import { UpdatePartnershipDto } from './dto/update-partnership.dto';

@Injectable()
export class PartnershipsService {
  private readonly logger = new Logger(PartnershipsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly settings: SettingsService,
  ) {}

  private async notifyAdmin(row: PartnershipInquiry) {
    if (!this.settings.notifications().adminOnSubmission) return;
    const cmsUrl = `${this.settings.siteUrl()}/cms/partnerships`;
    try {
      await this.mail.notifyAdmin({
        replyTo: row.email,
        subject: `[Prizni] Partnership inquiry: ${row.organization}`,
        text: [
          `${row.contactName} <${row.email}>${row.phone ? `, ${row.phone}` : ''}`,
          `Organization: ${row.organization}`,
          `Type: ${row.type}${row.budget ? ` · Budget: ${row.budget}` : ''}`,
          row.website ? `Website: ${row.website}` : '',
          '',
          row.message,
          '',
          `CMS: ${cmsUrl}`,
        ].join('\n'),
        html: `
          <p><strong>New partnership inquiry</strong></p>
          <p>
            ${escapeHtml(row.contactName)} &lt;${escapeHtml(row.email)}&gt;${row.phone ? `, ${escapeHtml(row.phone)}` : ''}<br/>
            Organization: ${escapeHtml(row.organization)}<br/>
            Type: ${escapeHtml(row.type)}${row.budget ? ` · Budget: ${escapeHtml(row.budget)}` : ''}
            ${row.website ? `<br/>Website: ${escapeHtml(row.website)}` : ''}
          </p>
          ${textToHtml(row.message)}
          <p><a href="${cmsUrl}">Open in CMS</a></p>
        `,
      });
    } catch (error) {
      this.logger.warn(
        `Partnership admin alert failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private toDto(row: PartnershipInquiry) {
    return {
      id: row.id,
      organization: row.organization,
      contactName: row.contactName,
      email: row.email,
      phone: row.phone,
      website: row.website,
      type: row.type,
      budget: row.budget,
      message: row.message,
      status: row.status,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async create(dto: CreatePartnershipDto) {
    if (dto.honeypot?.trim()) {
      return { ok: true as const };
    }

    const row = await this.prisma.partnershipInquiry.create({
      data: {
        organization: dto.organization.trim(),
        contactName: dto.contactName.trim(),
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone?.trim() || null,
        website: dto.website?.trim() || null,
        type: dto.type.trim(),
        budget: dto.budget?.trim() || null,
        message: dto.message.trim(),
      },
    });

    await this.notifyAdmin(row);

    return this.toDto(row);
  }

  async list(filters: {
    page?: number;
    pageSize?: number;
    q?: string;
    status?: PartnershipStatus;
  } = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 10));

    const where: Prisma.PartnershipInquiryWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.q?.trim()) {
      const q = filters.q.trim();
      where.OR = [
        { organization: { contains: q, mode: 'insensitive' } },
        { contactName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { type: { contains: q, mode: 'insensitive' } },
        { message: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.partnershipInquiry.count({ where }),
      this.prisma.partnershipInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return {
      items: rows.map((row) => this.toDto(row)),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async getById(id: string) {
    const row = await this.prisma.partnershipInquiry.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('Partnership inquiry not found');
    return this.toDto(row);
  }

  async update(id: string, dto: UpdatePartnershipDto) {
    await this.getById(id);
    const row = await this.prisma.partnershipInquiry.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes === undefined ? undefined : dto.notes,
      },
    });
    return this.toDto(row);
  }
}
