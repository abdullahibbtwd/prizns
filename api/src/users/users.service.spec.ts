import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorsService } from '../authors/authors.service';
import { createMockPrisma } from '../../test/helpers/mocks';
import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('UsersService', () => {
  let service: UsersService;
  let prisma: ReturnType<typeof createMockPrisma>;
  const authors = {
    create: jest.fn(),
    update: jest.fn(),
  };

  const row = {
    id: 'user-1',
    email: 'editor@prizni.bg',
    name: 'Editor',
    role: Role.EDITOR,
    isActive: true,
    emailVerifiedAt: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    author: null,
  };

  beforeEach(async () => {
    prisma = createMockPrisma({
      user: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([row]),
        findUnique: jest.fn().mockResolvedValue(row),
        create: jest.fn().mockResolvedValue(row),
        update: jest.fn().mockResolvedValue({ ...row, name: 'Updated' }),
      },
      author: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    });
    authors.create.mockReset();
    authors.create.mockResolvedValue({ id: 'author-1' });
    authors.update.mockReset();
    authors.update.mockResolvedValue({ id: 'author-1' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthorsService, useValue: authors },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  it('lists users with pagination', async () => {
    const result = await service.list({ page: 1, pageSize: 10 });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(2);
  });

  it('creates a CMS user', async () => {
    prisma.user.findUnique = jest.fn().mockResolvedValue(null);
    prisma.user.create = jest.fn().mockResolvedValue({
      ...row,
      id: 'user-2',
      email: 'new@prizni.bg',
      name: 'New Editor',
    });

    const created = await service.create({
      email: 'New@prizni.bg',
      name: 'New Editor',
      password: 'secret12',
      role: Role.EDITOR,
    });

    expect(created.user.email).toBe('new@prizni.bg');
    expect(created.authorCreated).toBe(false);
    expect(authors.create).not.toHaveBeenCalled();
  });

  it('creates an author profile for AUTHOR users', async () => {
    prisma.user.findUnique = jest.fn().mockResolvedValue(null);
    prisma.user.create = jest.fn().mockResolvedValue({
      ...row,
      id: 'user-3',
      email: 'writer@prizni.bg',
      name: 'Iva Petrova',
      role: Role.AUTHOR,
    });

    const created = await service.create({
      email: 'writer@prizni.bg',
      name: 'Iva Petrova',
      password: 'secret12',
      role: Role.AUTHOR,
    });

    expect(created.authorCreated).toBe(true);
    expect(created.user.authorId).toBe('author-1');
    expect(authors.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nameBg: 'Iva Petrova',
        userId: 'user-3',
      }),
    );
  });

  it('rejects duplicate emails', async () => {
    await expect(
      service.create({
        email: 'editor@prizni.bg',
        name: 'Dup',
        password: 'secret12',
        role: Role.EDITOR,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates a user', async () => {
    const updated = await service.update('user-1', { name: 'Updated' }, 'admin-1');
    expect(updated.user.name).toBe('Updated');
    expect(updated.emailChanged).toBe(false);
  });

  it('resets email verification when the email changes', async () => {
    prisma.user.findUnique = jest
      .fn()
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce(null);
    prisma.user.update = jest.fn().mockResolvedValue({
      ...row,
      email: 'new@prizni.bg',
      emailVerifiedAt: null,
    });

    const updated = await service.update(
      'user-1',
      { email: 'new@prizni.bg' },
      'admin-1',
    );
    expect(updated.emailChanged).toBe(true);
    expect(updated.user.emailVerified).toBe(false);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'new@prizni.bg',
          emailVerifiedAt: null,
        }),
      }),
    );
  });

  it('links an author profile when role becomes AUTHOR', async () => {
    prisma.user.findUnique = jest.fn().mockResolvedValue(row);
    prisma.user.update = jest.fn().mockResolvedValue({
      ...row,
      role: Role.AUTHOR,
    });

    const updated = await service.update(
      'user-1',
      { role: Role.AUTHOR },
      'admin-1',
    );

    expect(updated.authorCreated).toBe(true);
    expect(updated.user.authorId).toBe('author-1');
  });

  it('throws when user is missing', async () => {
    prisma.user.findUnique = jest.fn().mockResolvedValue(null);
    await expect(
      service.update('missing', { name: 'X' }, 'admin-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('prevents self-deactivation', async () => {
    await expect(
      service.update('user-1', { isActive: false }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents demoting the last active admin to another role', async () => {
    prisma.user.findUnique = jest.fn().mockResolvedValue({
      ...row,
      id: 'admin-1',
      role: Role.ADMIN,
    });
    prisma.user.count = jest.fn().mockResolvedValue(1);

    await expect(
      service.update('admin-1', { role: Role.AUTHOR }, 'admin-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns the current user profile', async () => {
    prisma.user.findUnique = jest.fn().mockResolvedValue({
      ...row,
      imageUrl: null,
      bio: 'Hello',
      websiteUrl: null,
      facebookUrl: null,
      instagramUrl: null,
      youtubeUrl: null,
      linkedinUrl: null,
      xUsername: 'prizni',
      author: { id: 'author-1' },
    });
    const profile = await service.getProfile('user-1');
    expect(profile.bio).toBe('Hello');
    expect(profile.xUsername).toBe('prizni');
  });

  it('updates profile fields and syncs the linked author', async () => {
    prisma.user.findUnique = jest
      .fn()
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'editor@prizni.bg',
        author: { id: 'author-1' },
      })
      .mockResolvedValueOnce(null);
    prisma.user.update = jest.fn().mockResolvedValue({
      ...row,
      name: 'Iva',
      bio: 'Northwest',
      imageUrl: null,
      websiteUrl: null,
      facebookUrl: null,
      instagramUrl: null,
      youtubeUrl: null,
      linkedinUrl: null,
      xUsername: null,
      author: { id: 'author-1' },
    });

    const result = await service.updateProfile('user-1', {
      name: 'Iva',
      bio: 'Northwest',
    });

    expect(result.profile.name).toBe('Iva');
    expect(result.authorUpdated).toBe(true);
    expect(authors.update).toHaveBeenCalledWith(
      'author-1',
      expect.objectContaining({ nameBg: 'Iva', bioBg: 'Northwest' }),
    );
  });
});
