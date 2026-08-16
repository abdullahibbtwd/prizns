import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrisma } from '../../test/helpers/mocks';
import { TodosService } from './todos.service';

describe('TodosService', () => {
  let service: TodosService;
  let prisma: ReturnType<typeof createMockPrisma>;

  const row = {
    id: 'todo-1',
    title: 'Review draft',
    done: false,
    dueAt: new Date('2026-08-14T10:00:00.000Z'),
    createdAt: new Date('2026-08-14T09:00:00.000Z'),
    updatedAt: new Date('2026-08-14T09:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = createMockPrisma({
      editorialTodo: {
        findMany: jest.fn().mockResolvedValue([row]),
        create: jest.fn().mockResolvedValue(row),
        findFirst: jest.fn().mockResolvedValue(row),
        update: jest.fn().mockResolvedValue({ ...row, done: true }),
        delete: jest.fn().mockResolvedValue(row),
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodosService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(TodosService);
  });

  it('lists todos for a user', async () => {
    const items = await service.list('user-1');
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe('Review draft');
    expect(prisma.editorialTodo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } }),
    );
  });

  it('creates a todo', async () => {
    const created = await service.create('user-1', { title: '  New task  ' });
    expect(created.title).toBe('Review draft');
    expect(prisma.editorialTodo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: 'New task' }),
      }),
    );
  });

  it('updates a todo', async () => {
    const updated = await service.update('user-1', 'todo-1', { done: true });
    expect(updated.done).toBe(true);
  });

  it('throws when updating a missing todo', async () => {
    prisma.editorialTodo.findFirst = jest.fn().mockResolvedValue(null);
    await expect(
      service.update('user-1', 'missing', { done: true }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('removes a todo', async () => {
    await expect(service.remove('user-1', 'todo-1')).resolves.toEqual({
      ok: true,
    });
  });
});
