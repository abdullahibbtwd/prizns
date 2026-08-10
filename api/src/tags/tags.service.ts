import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TagKind } from '@prisma/client';
import { ensureUniqueSlug } from '../common/slug.util';
import { PrismaService } from '../prisma/prisma.service';
import { TranslationService } from '../translation/translation.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly translation: TranslationService,
  ) {}

  private toDto(tag: {
    id: string;
    slug: string;
    kind: TagKind;
    nameBg: string;
    nameEn: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: tag.id,
      slug: tag.slug,
      kind: tag.kind,
      nameBg: tag.nameBg,
      nameEn: tag.nameEn,
      name: tag.nameEn ?? tag.nameBg,
      createdAt: tag.createdAt.toISOString(),
      updatedAt: tag.updatedAt.toISOString(),
    };
  }

  async listPublic(kind?: string) {
    const where: Prisma.TagWhereInput = {};
    if (kind?.trim()) {
      const normalized = kind.trim().toUpperCase();
      if (!(Object.values(TagKind) as string[]).includes(normalized)) {
        throw new BadRequestException('Invalid tag kind');
      }
      where.kind = normalized as TagKind;
    }
    const rows = await this.prisma.tag.findMany({
      where,
      orderBy: [{ kind: 'asc' }, { nameBg: 'asc' }],
    });
    return rows.map((row) => this.toDto(row));
  }

  async listCms(kind?: string) {
    return this.listPublic(kind);
  }

  async getById(id: string) {
    const row = await this.prisma.tag.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Tag not found');
    return this.toDto(row);
  }

  async create(dto: CreateTagDto) {
    const names = await this.translation.bilingualFromSingle(dto.nameBg);
    const slug = await ensureUniqueSlug(names.bg || dto.nameBg, async (candidate) => {
      const found = await this.prisma.tag.findUnique({
        where: { kind_slug: { kind: dto.kind, slug: candidate } },
        select: { id: true },
      });
      return Boolean(found);
    });

    const row = await this.prisma.tag.create({
      data: {
        kind: dto.kind,
        slug,
        nameBg: names.bg || dto.nameBg.trim(),
        nameEn: names.en || null,
      },
    });
    return this.toDto(row);
  }

  async update(id: string, dto: UpdateTagDto) {
    const existing = await this.prisma.tag.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tag not found');

    const kind = dto.kind ?? existing.kind;
    const nameChanged =
      dto.nameBg !== undefined && dto.nameBg.trim() !== existing.nameBg;

    let nameBg = existing.nameBg;
    let nameEn = existing.nameEn;

    if (nameChanged && dto.nameBg) {
      const names = await this.translation.bilingualFromSingle(dto.nameBg);
      nameBg = names.bg || dto.nameBg.trim();
      nameEn = names.en || null;
    } else if (dto.nameEn !== undefined) {
      nameEn = dto.nameEn?.trim() || null;
    }

    const kindChanged = dto.kind !== undefined && dto.kind !== existing.kind;

    const slug =
      nameChanged || kindChanged
        ? await ensureUniqueSlug(nameBg, async (candidate) => {
            const found = await this.prisma.tag.findUnique({
              where: { kind_slug: { kind, slug: candidate } },
              select: { id: true },
            });
            return Boolean(found && found.id !== id);
          })
        : existing.slug;

    const row = await this.prisma.tag.update({
      where: { id },
      data: {
        kind,
        slug,
        nameBg,
        nameEn,
      },
    });
    return this.toDto(row);
  }

  async remove(id: string) {
    await this.getById(id);
    await this.prisma.tag.delete({ where: { id } });
    return { ok: true as const, id };
  }
}
