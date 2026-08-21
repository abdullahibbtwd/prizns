import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { TranslationService } from '../translation/translation.service';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { overrideGuards } from '../../test/helpers/guards';
import { mockAuthUser } from '../../test/helpers/mocks';

describe('UsersController', () => {
  let controller: UsersController;
  const users = { list: jest.fn(), update: jest.fn(), create: jest.fn(), remove: jest.fn() };
  const translation = { enqueueAuthor: jest.fn() };
  const auth = { sendAccountCreatedEmail: jest.fn() };

  beforeEach(async () => {
    users.create.mockReset();
    users.update.mockReset();
    users.remove.mockReset();
    translation.enqueueAuthor.mockReset();
    auth.sendAccountCreatedEmail.mockReset();
    auth.sendAccountCreatedEmail.mockResolvedValue({ sent: true });
    const builder = Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: users },
        { provide: TranslationService, useValue: translation },
        { provide: AuthService, useValue: auth },
      ],
    });
    overrideGuards(builder, JwtAuthGuard, RolesGuard);
    const module = await builder.compile();
    controller = module.get(UsersController);
  });

  it('lists users with parsed role', () => {
    controller.list('1', '10', 'editor', 'EDITOR');
    expect(users.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 10, role: 'EDITOR' }),
    );
  });

  it('creates a user and queues author translation', async () => {
    users.create.mockResolvedValue({
      user: { id: 'u3', authorId: 'a1' },
      authorCreated: true,
    });
    const created = await controller.create({
      email: 'writer@prizni.bg',
      name: 'Iva',
      password: 'secret12',
      role: 'AUTHOR',
    } as never);
    expect(created.authorId).toBe('a1');
    expect(translation.enqueueAuthor).toHaveBeenCalledWith('a1');
    expect(auth.sendAccountCreatedEmail).toHaveBeenCalledWith('u3');
  });

  it('updates user with actor id', async () => {
    users.update.mockResolvedValue({
      user: { id: 'user-2', name: 'Updated', authorId: null },
      authorCreated: false,
      emailChanged: false,
    });
    const dto = { name: 'Updated' };
    const updated = await controller.update('user-2', dto, mockAuthUser);
    expect(users.update).toHaveBeenCalledWith('user-2', dto, mockAuthUser.id);
    expect(updated.name).toBe('Updated');
    expect(translation.enqueueAuthor).not.toHaveBeenCalled();
  });

  it('deletes a user with actor id', async () => {
    users.remove.mockResolvedValue({ ok: true, id: 'user-2' });
    const removed = await controller.remove('user-2', mockAuthUser);
    expect(users.remove).toHaveBeenCalledWith('user-2', mockAuthUser.id);
    expect(removed).toEqual({ ok: true, id: 'user-2' });
  });
});
