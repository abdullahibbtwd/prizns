import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthorsService } from '../authors/authors.service';
import { hasAdminRole, normalizeRoles, primaryRole } from '../auth/role-access';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  roles: true,
  isActive: true,
  emailVerifiedAt: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, showOnAuthors: true } },
} as const;

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  roles: Role[];
  isActive: boolean;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author?: { id: string; showOnAuthors?: boolean } | null;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authors: AuthorsService,
  ) {}

  private toDto(row: UserRow, authorId?: string | null) {
    const roles = normalizeRoles(row.role, row.roles);
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      roles,
      isActive: row.isActive,
      emailVerified: Boolean(row.emailVerifiedAt),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      joinedAt: row.createdAt.toISOString().slice(0, 10),
      authorId: authorId ?? row.author?.id ?? null,
      showOnAuthors: Boolean(row.author?.showOnAuthors),
    };
  }

  private resolveRoles(dto: { role?: Role; roles?: Role[] }): Role[] {
    const roles = normalizeRoles(dto.role, dto.roles);
    if (!roles.length) {
      throw new BadRequestException('At least one role is required');
    }
    return roles;
  }

  private async ensureAuthorProfile(
    user: {
      id: string;
      email: string;
      name: string | null;
    },
    showOnAuthors?: boolean,
  ) {
    const existing = await this.prisma.author.findUnique({
      where: { userId: user.id },
      select: { id: true, showOnAuthors: true },
    });
    if (existing) {
      if (
        showOnAuthors !== undefined &&
        showOnAuthors !== existing.showOnAuthors
      ) {
        await this.prisma.author.update({
          where: { id: existing.id },
          data: { showOnAuthors },
        });
      }
      return { id: existing.id, created: false };
    }

    const author = await this.authors.create({
      nameBg: user.name?.trim() || user.email,
      roleBg: 'Автор',
      userId: user.id,
      showOnAuthors: showOnAuthors ?? true,
    });
    return { id: author.id, created: true };
  }

  private async syncAuthorListing(
    user: {
      id: string;
      email: string;
      name: string | null;
      roles: Role[];
      author?: { id: string } | null;
    },
    showOnAuthors?: boolean,
  ) {
    const isAuthorRole = user.roles.includes(Role.AUTHOR);
    const hasAuthor = Boolean(user.author?.id);

    if (showOnAuthors === true || isAuthorRole) {
      const author = await this.ensureAuthorProfile(user, showOnAuthors);
      return { authorId: author.id, authorCreated: author.created };
    }

    if (showOnAuthors === false && hasAuthor) {
      await this.prisma.author.update({
        where: { id: user.author!.id },
        data: { showOnAuthors: false },
      });
      return { authorId: user.author!.id, authorCreated: false };
    }

    return { authorId: user.author?.id ?? null, authorCreated: false };
  }

  async list(
    filters: {
      page?: number;
      pageSize?: number;
      q?: string;
      role?: Role;
    } = {},
  ) {
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 10));
    const where: Prisma.UserWhereInput = {};

    if (filters.role) {
      where.OR = [
        { role: filters.role },
        { roles: { has: filters.role } },
      ];
    }
    if (filters.q?.trim()) {
      const q = filters.q.trim();
      const nameEmail: Prisma.UserWhereInput[] = [
        { email: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: nameEmail }];
        delete where.OR;
      } else {
        where.OR = nameEmail;
      }
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: userSelect,
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

  async create(dto: CreateUserDto) {
    const email = dto.email.toLowerCase().trim();
    const name = dto.name.trim();
    const roles = this.resolveRoles(dto);
    const role = primaryRole(roles);
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    let row: UserRow;
    try {
      row = await this.prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          role,
          roles,
        },
        select: userSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A user with this email already exists');
      }
      throw error;
    }

    const listing = await this.syncAuthorListing(
      { ...row, roles },
      dto.showOnAuthors,
    );

    return {
      user: this.toDto(
        {
          ...row,
          author: listing.authorId
            ? {
                id: listing.authorId,
                showOnAuthors:
                  dto.showOnAuthors ?? roles.includes(Role.AUTHOR),
              }
            : row.author,
        },
        listing.authorId,
      ),
      authorCreated: listing.authorCreated,
    };
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...userSelect,
        author: { select: { id: true, showOnAuthors: true } },
      },
    });
    if (!existing) throw new NotFoundException('User not found');

    if (existing.id === actorId && dto.isActive === false) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    const nextRoles =
      dto.roles !== undefined || dto.role !== undefined
        ? this.resolveRoles({
            role: dto.role,
            roles: dto.roles ?? (dto.role ? [dto.role] : existing.roles),
          })
        : normalizeRoles(existing.role, existing.roles);
    const nextPrimary = primaryRole(nextRoles);

    if (hasAdminRole(existing) && !nextRoles.includes(Role.ADMIN)) {
      const adminCount = await this.prisma.user.count({
        where: {
          isActive: true,
          OR: [{ role: Role.ADMIN }, { roles: { has: Role.ADMIN } }],
        },
      });
      if (adminCount <= 1 && existing.isActive) {
        throw new BadRequestException('Cannot demote the last active admin');
      }
    }

    const email = dto.email?.toLowerCase().trim();
    let emailChanged = false;
    if (email && email !== existing.email) {
      const taken = await this.prisma.user.findUnique({ where: { email } });
      if (taken) {
        throw new ConflictException('A user with this email already exists');
      }
      emailChanged = true;
    }

    const row = await this.prisma.user.update({
      where: { id },
      data: {
        role: nextPrimary,
        roles: nextRoles,
        isActive: dto.isActive,
        name: dto.name === undefined ? undefined : dto.name.trim() || null,
        email: emailChanged ? email : undefined,
        emailVerifiedAt: emailChanged ? null : undefined,
      },
      select: userSelect,
    });

    const listing = await this.syncAuthorListing(
      { ...row, roles: nextRoles },
      dto.showOnAuthors,
    );

    return {
      user: this.toDto(
        {
          ...row,
          author: listing.authorId
            ? {
                id: listing.authorId,
                showOnAuthors:
                  dto.showOnAuthors ??
                  row.author?.showOnAuthors ??
                  nextRoles.includes(Role.AUTHOR),
              }
            : row.author,
        },
        listing.authorId,
      ),
      authorCreated: listing.authorCreated,
      emailChanged,
    };
  }

  async getProfile(userId: string) {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...userSelect,
        imageUrl: true,
        bio: true,
        websiteUrl: true,
        facebookUrl: true,
        instagramUrl: true,
        youtubeUrl: true,
        linkedinUrl: true,
        xUsername: true,
      },
    });
    if (!row) throw new NotFoundException('User not found');
    return this.toProfileDto(row);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, author: { select: { id: true } } },
    });
    if (!existing) throw new NotFoundException('User not found');

    const email = dto.email?.toLowerCase().trim();
    let emailChanged = false;
    if (email && email !== existing.email) {
      const taken = await this.prisma.user.findUnique({ where: { email } });
      if (taken) {
        throw new ConflictException('A user with this email already exists');
      }
      emailChanged = true;
    }

    const blankToNull = (value?: string) => {
      if (value === undefined) return undefined;
      const trimmed = value.trim();
      return trimmed ? trimmed : null;
    };

    let passwordHash: string | undefined;
    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, 12);
    }

    const row = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name === undefined ? undefined : dto.name.trim() || null,
        email,
        emailVerifiedAt: emailChanged ? null : undefined,
        bio: blankToNull(dto.bio),
        websiteUrl: blankToNull(dto.websiteUrl),
        facebookUrl: blankToNull(dto.facebookUrl),
        instagramUrl: blankToNull(dto.instagramUrl),
        youtubeUrl: blankToNull(dto.youtubeUrl),
        linkedinUrl: blankToNull(dto.linkedinUrl),
        xUsername: blankToNull(dto.xUsername?.replace(/^@/, '')),
        imageUrl: blankToNull(dto.imageUrl),
        passwordHash,
      },
      select: {
        ...userSelect,
        imageUrl: true,
        bio: true,
        websiteUrl: true,
        facebookUrl: true,
        instagramUrl: true,
        youtubeUrl: true,
        linkedinUrl: true,
        xUsername: true,
      },
    });

    let authorUpdated = false;
    if (
      existing.author &&
      (dto.name !== undefined || dto.bio !== undefined || dto.imageUrl !== undefined)
    ) {
      await this.authors.update(existing.author.id, {
        ...(dto.name !== undefined ? { nameBg: dto.name.trim() || row.email } : {}),
        ...(dto.bio !== undefined ? { bioBg: dto.bio } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
      });
      authorUpdated = dto.name !== undefined || dto.bio !== undefined;
    }

    return { profile: this.toProfileDto(row), authorUpdated, emailChanged };
  }

  private toProfileDto(
    row: UserRow & {
      imageUrl: string | null;
      bio: string | null;
      websiteUrl: string | null;
      facebookUrl: string | null;
      instagramUrl: string | null;
      youtubeUrl: string | null;
      linkedinUrl: string | null;
      xUsername: string | null;
    },
  ) {
    return {
      ...this.toDto(row),
      imageUrl: row.imageUrl,
      bio: row.bio,
      websiteUrl: row.websiteUrl,
      facebookUrl: row.facebookUrl,
      instagramUrl: row.instagramUrl,
      youtubeUrl: row.youtubeUrl,
      linkedinUrl: row.linkedinUrl,
      xUsername: row.xUsername,
    };
  }
}
