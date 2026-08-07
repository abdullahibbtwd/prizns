import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTodoDto, UpdateTodoDto } from './dto/todo.dto';

@Injectable()
export class TodosService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(row: {
    id: string;
    title: string;
    done: boolean;
    dueAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      title: row.title,
      done: row.done,
      dueAt: row.dueAt ? row.dueAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async list(userId: string) {
    const rows = await this.prisma.editorialTodo.findMany({
      where: { userId },
      orderBy: [{ done: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => this.toDto(row));
  }

  async create(userId: string, dto: CreateTodoDto) {
    const row = await this.prisma.editorialTodo.create({
      data: {
        userId,
        title: dto.title.trim(),
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      },
    });
    return this.toDto(row);
  }

  async update(userId: string, id: string, dto: UpdateTodoDto) {
    const existing = await this.prisma.editorialTodo.findFirst({
      where: { id, userId },
    });
    if (!existing) throw new NotFoundException('Todo not found');

    const row = await this.prisma.editorialTodo.update({
      where: { id },
      data: {
        title: dto.title === undefined ? undefined : dto.title.trim(),
        done: dto.done,
        dueAt:
          dto.dueAt === undefined
            ? undefined
            : dto.dueAt
              ? new Date(dto.dueAt)
              : null,
      },
    });
    return this.toDto(row);
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.editorialTodo.findFirst({
      where: { id, userId },
    });
    if (!existing) throw new NotFoundException('Todo not found');
    await this.prisma.editorialTodo.delete({ where: { id } });
    return { ok: true };
  }
}
