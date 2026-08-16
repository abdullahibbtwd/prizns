import { Test, TestingModule } from '@nestjs/testing';
import { TodosController } from './todos.controller';
import { TodosService } from './todos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { overrideGuards } from '../../test/helpers/guards';
import { mockAuthUser } from '../../test/helpers/mocks';

describe('TodosController', () => {
  let controller: TodosController;
  const todos = {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [TodosController],
      providers: [{ provide: TodosService, useValue: todos }],
    });
    overrideGuards(builder, JwtAuthGuard);
    const module = await builder.compile();
    controller = module.get(TodosController);
  });

  it('lists todos for current user', () => {
    controller.list(mockAuthUser);
    expect(todos.list).toHaveBeenCalledWith(mockAuthUser.id);
  });

  it('creates todo for current user', () => {
    const dto = { title: 'Task' };
    controller.create(mockAuthUser, dto);
    expect(todos.create).toHaveBeenCalledWith(mockAuthUser.id, dto);
  });

  it('updates todo', () => {
    controller.update(mockAuthUser, 'todo-1', { done: true });
    expect(todos.update).toHaveBeenCalledWith(mockAuthUser.id, 'todo-1', {
      done: true,
    });
  });
});
