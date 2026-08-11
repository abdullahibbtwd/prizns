import { Injectable, NotFoundException } from '@nestjs/common';
import { ArticleStatus, TranslationStatus } from '@prisma/client';
import { BadgesService } from '../badges/badges.service';
import { ensureUniqueSlug } from '../common/slug.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';

const authorSelect = {
  id: true,
  slug: true,
  nameBg: true,
  nameEn: true,
  roleBg: true,
  roleEn: true,
  locationBg: true,
  locationEn: true,
  quoteBg: true,
  quoteEn: true,
  bioBg: true,
  bioEn: true,
  imageUrl: true,
  aliases: true,
  isActive: true,
  translationStatus: true,
  translationError: true,
  sourceLang: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { articles: true } },
} as const;

const publicAuthorSelect = {
  id: true,
  slug: true,
  nameBg: true,
  nameEn: true,
  roleBg: true,
  roleEn: true,
  locationBg: true,
  locationEn: true,
  quoteBg: true,
  quoteEn: true,
  bioBg: true,
  bioEn: true,
  imageUrl: true,
  aliases: true,
  _count: {
    select: {
      articles: { where: { status: ArticleStatus.PUBLISHED } },
    },
  },
} as const;

@Injectable()
export class AuthorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly badges: BadgesService,
  ) {}

  listActive() {
    return this.prisma.author.findMany({
      where: { isActive: true },
      orderBy: { nameBg: 'asc' },
      select: {
        id: true,
        slug: true,
        nameBg: true,
        nameEn: true,
        roleBg: true,
        roleEn: true,
        imageUrl: true,
      },
    });
  }

  async listPublic() {
    const rows = await this.prisma.author.findMany({
      where: { isActive: true },
      orderBy: { nameBg: 'asc' },
      select: publicAuthorSelect,
    });
    return Promise.all(rows.map((row) => this.toPublicDto(row)));
  }

  async getPublicBySlug(slug: string) {
    const row = await this.prisma.author.findFirst({
      where: { slug, isActive: true },
      select: publicAuthorSelect,
    });
    return row ? this.toPublicDto(row) : null;
  }

  private async toPublicDto(
    row: {
      id: string;
      slug: string;
      nameBg: string;
      nameEn: string | null;
      roleBg: string;
      roleEn: string | null;
      locationBg: string | null;
      locationEn: string | null;
      quoteBg: string | null;
      quoteEn: string | null;
      bioBg: string | null;
      bioEn: string | null;
      imageUrl: string | null;
      aliases: string[];
      _count: { articles: number };
    },
  ) {
    const badges = await this.badges.badgesForAuthor(row.id);
    return {
      id: row.id,
      slug: row.slug,
      path: `/authors/${row.slug}`,
      name: row.nameEn ?? row.nameBg,
      nameBg: row.nameBg,
      role: row.roleEn ?? row.roleBg,
      roleBg: row.roleBg,
      location: row.locationEn ?? row.locationBg ?? '',
      locationBg: row.locationBg ?? '',
      quote: row.quoteEn ?? row.quoteBg ?? '',
      quoteBg: row.quoteBg ?? '',
      bio: row.bioEn ?? row.bioBg ?? '',
      bioBg: row.bioBg ?? '',
      image: row.imageUrl ?? '',
      aliases: row.aliases,
      storyCount: row._count.articles,
      badges,
    };
  }

  listCms() {
    return this.prisma.author.findMany({
      orderBy: { nameBg: 'asc' },
      select: authorSelect,
    });
  }

  async getById(id: string) {
    const author = await this.prisma.author.findUnique({
      where: { id },
      select: authorSelect,
    });
    if (!author) throw new NotFoundException('Author not found');
    return author;
  }

  private async slugFromName(nameBg: string, excludeId?: string) {
    return ensureUniqueSlug(nameBg, async (candidate) => {
      const found = await this.prisma.author.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      return Boolean(found && found.id !== excludeId);
    });
  }

  async create(dto: CreateAuthorDto) {
    const nameBg = dto.nameBg.trim();
    const slug = await this.slugFromName(nameBg);

    return this.prisma.author.create({
      data: {
        slug,
        nameBg,
        nameEn: null,
        roleBg: dto.roleBg?.trim() || 'Автор',
        roleEn: null,
        locationBg: dto.locationBg?.trim() || null,
        locationEn: null,
        quoteBg: dto.quoteBg?.trim() || null,
        quoteEn: null,
        bioBg: dto.bioBg?.trim() || null,
        bioEn: null,
        imageUrl: dto.imageUrl?.trim() || null,
        aliases: dto.aliases ?? [],
        isActive: dto.isActive ?? true,
        translationStatus: TranslationStatus.PENDING,
        translationError: null,
      },
      select: authorSelect,
    });
  }

  /** Quick create used by the article editor author picker. */
  createQuick(nameBg: string) {
    return this.create({ nameBg });
  }

  async update(id: string, dto: UpdateAuthorDto) {
    const existing = await this.prisma.author.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Author not found');

    const nameBg = dto.nameBg?.trim();
    const roleBg = dto.roleBg?.trim();
    const locationBg =
      dto.locationBg !== undefined ? dto.locationBg?.trim() || null : undefined;
    const quoteBg =
      dto.quoteBg !== undefined ? dto.quoteBg?.trim() || null : undefined;
    const bioBg =
      dto.bioBg !== undefined ? dto.bioBg?.trim() || null : undefined;

    const nameChanged = nameBg !== undefined && nameBg !== existing.nameBg;
    const bgChanged =
      nameChanged ||
      (roleBg !== undefined && roleBg !== existing.roleBg) ||
      (locationBg !== undefined && locationBg !== existing.locationBg) ||
      (quoteBg !== undefined && quoteBg !== existing.quoteBg) ||
      (bioBg !== undefined && bioBg !== existing.bioBg);

    const slug = nameChanged
      ? await this.slugFromName(nameBg!, id)
      : undefined;

    return this.prisma.author.update({
      where: { id },
      data: {
        ...(nameBg ? { nameBg } : {}),
        ...(slug ? { slug } : {}),
        ...(roleBg !== undefined
          ? { roleBg: roleBg || existing.roleBg }
          : {}),
        ...(locationBg !== undefined ? { locationBg } : {}),
        ...(quoteBg !== undefined ? { quoteBg } : {}),
        ...(bioBg !== undefined ? { bioBg } : {}),
        ...(dto.imageUrl !== undefined
          ? { imageUrl: dto.imageUrl?.trim() || null }
          : {}),
        ...(dto.aliases !== undefined ? { aliases: dto.aliases } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(bgChanged
          ? {
              nameEn: null,
              roleEn: null,
              locationEn: null,
              quoteEn: null,
              bioEn: null,
              translationStatus: TranslationStatus.PENDING,
              translationError: null,
            }
          : {}),
      },
      select: authorSelect,
    });
  }

  async ensureDefaultAuthor() {
    const existing = await this.prisma.author.findFirst();
    if (existing) return existing;

    return this.prisma.author.create({
      data: {
        slug: 'prizn-desk',
        nameBg: 'Редакция Призни',
        nameEn: 'PRIZN Desk',
        roleBg: 'Редакция',
        roleEn: 'Editorial desk',
        locationBg: 'Северозападна България',
        locationEn: 'Northwest Bulgaria',
        bioBg: 'Редакционният екип на Призни.',
        bioEn: 'The PRIZN editorial team.',
        aliases: ['PRIZNI Audio Desk', 'PRIZN Desk'],
        translationStatus: TranslationStatus.READY,
      },
    });
  }
}
