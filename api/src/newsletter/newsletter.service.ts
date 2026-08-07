import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';

@Injectable()
export class NewsletterService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(row: {
    id: string;
    email: string;
    source: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      email: row.email,
      source: row.source,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      subscribedAt: row.createdAt.toISOString().slice(0, 10),
    };
  }

  async subscribe(dto: SubscribeNewsletterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException('This email is already subscribed');
    }

    try {
      const row = await this.prisma.newsletterSubscriber.create({
        data: {
          email,
          source: dto.source?.trim() || 'website',
        },
      });
      return this.toDto(row);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('This email is already subscribed');
      }
      throw error;
    }
  }

  async list(filters: { page?: number; pageSize?: number; q?: string } = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
    const where: Prisma.NewsletterSubscriberWhereInput = {};
    if (filters.q?.trim()) {
      where.email = { contains: filters.q.trim(), mode: 'insensitive' };
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.newsletterSubscriber.count({ where }),
      this.prisma.newsletterSubscriber.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((row) => this.toDto(row)),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async count() {
    const total = await this.prisma.newsletterSubscriber.count();
    return { total };
  }

  async remove(id: string) {
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Subscriber not found');
    await this.prisma.newsletterSubscriber.delete({ where: { id } });
    return { ok: true };
  }
}
