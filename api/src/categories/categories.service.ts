import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TranslationStatus } from '@prisma/client';
import { ensureUniqueSlug } from '../common/slug.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const categorySelect = {
  id: true,
  slug: true,
  nameBg: true,
  nameEn: true,
  descriptionBg: true,
  descriptionEn: true,
  parentId: true,
  translationStatus: true,
  translationError: true,
  sourceLang: true,
  createdAt: true,
  updatedAt: true,
  parent: { select: { id: true, nameBg: true, nameEn: true, slug: true } },
  _count: { select: { children: true, articleCategories: true } },
} as const;

type CategoryRow = Prisma.CategoryGetPayload<{ select: typeof categorySelect }>;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(row: CategoryRow) {
    return {
      id: row.id,
      slug: row.slug,
      nameBg: row.nameBg,
      nameEn: row.nameEn,
      name: row.nameEn ?? row.nameBg,
      descriptionBg: row.descriptionBg,
      descriptionEn: row.descriptionEn,
      parentId: row.parentId,
      parentName: row.parent?.nameEn ?? row.parent?.nameBg ?? null,
      translationStatus: row.translationStatus,
      translationError: row.translationError,
      sourceLang: row.sourceLang,
      childCount: row._count.children,
      articleCount: row._count.articleCategories,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async list() {
    const rows = await this.prisma.category.findMany({
      orderBy: [{ nameBg: 'asc' }],
      select: categorySelect,
    });
    return rows.map((row) => this.toDto(row));
  }

  async getById(id: string) {
    const row = await this.prisma.category.findUnique({
      where: { id },
      select: categorySelect,
    });
    if (!row) throw new NotFoundException('Category not found');
    return this.toDto(row);
  }

  async create(dto: CreateCategoryDto) {
    const nameBg = dto.nameBg.trim();
    const descriptionBg = dto.descriptionBg?.trim() || null;

    const slugSource = dto.slug?.trim() || nameBg;
    const slug = await ensureUniqueSlug(slugSource, async (candidate) => {
      const found = await this.prisma.category.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      return Boolean(found);
    });

    const row = await this.prisma.category.create({
      data: {
        slug,
        nameBg,
        descriptionBg,
        parentId: null,
        translationStatus: TranslationStatus.PENDING,
      },
      select: categorySelect,
    });
    return this.toDto(row);
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { id },
      select: categorySelect,
    });
    if (!existing) throw new NotFoundException('Category not found');

    const nameChanged =
      dto.nameBg !== undefined && dto.nameBg.trim() !== existing.nameBg;
    const descriptionChanged =
      dto.descriptionBg !== undefined &&
      (dto.descriptionBg.trim() || null) !== existing.descriptionBg;
    const nameBg = dto.nameBg === undefined ? existing.nameBg : dto.nameBg.trim();
    const descriptionBg =
      dto.descriptionBg === undefined
        ? existing.descriptionBg
        : dto.descriptionBg.trim() || null;

    const slugSource = dto.slug?.trim();
    const slug =
      slugSource || nameChanged
        ? await ensureUniqueSlug(slugSource || nameBg, async (candidate) => {
            const found = await this.prisma.category.findUnique({
              where: { slug: candidate },
              select: { id: true },
            });
            return Boolean(found && found.id !== id);
          })
        : existing.slug;

    const needsTranslation = nameChanged || descriptionChanged;

    const row = await this.prisma.category.update({
      where: { id },
      data: {
        slug,
        nameBg,
        descriptionBg,
        parentId: null,
        nameEn: dto.nameEn === undefined ? undefined : dto.nameEn.trim() || null,
        descriptionEn:
          dto.descriptionEn === undefined
            ? undefined
            : dto.descriptionEn.trim() || null,
        translationStatus: needsTranslation
          ? TranslationStatus.PENDING
          : undefined,
        translationError: needsTranslation ? null : undefined,
      },
      select: categorySelect,
    });
    return this.toDto(row);
  }

  async remove(id: string) {
    const existing = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true, _count: { select: { children: true } } },
    });
    if (!existing) throw new NotFoundException('Category not found');
    if (existing._count.children > 0) {
      throw new BadRequestException(
        'Remove subcategories before deleting this category',
      );
    }
    await this.prisma.category.delete({ where: { id } });
    return { ok: true as const, id };
  }
}
