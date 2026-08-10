import { Injectable, NotFoundException } from '@nestjs/common';
import { PartnershipInquiry, PartnershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePartnershipDto } from './dto/create-partnership.dto';
import { UpdatePartnershipDto } from './dto/update-partnership.dto';

@Injectable()
export class PartnershipsService {
  constructor(private readonly prisma: PrismaService) {}

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
