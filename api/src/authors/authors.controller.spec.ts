import { Test, TestingModule } from '@nestjs/testing';
import { AuthorsController } from './authors.controller';
import { AuthorsService } from './authors.service';
import { TranslationService } from '../translation/translation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { overrideGuards } from '../../test/helpers/guards';

describe('AuthorsController', () => {
  let controller: AuthorsController;
  const authors = {
    listCms: jest.fn(),
    listActive: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const translation = { enqueueAuthor: jest.fn() };

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [AuthorsController],
      providers: [
        { provide: AuthorsService, useValue: authors },
        { provide: TranslationService, useValue: translation },
      ],
    });
    overrideGuards(builder, JwtAuthGuard);
    const module = await builder.compile();
    controller = module.get(AuthorsController);
  });

  it('lists active authors by default', () => {
    controller.list(undefined);
    expect(authors.listActive).toHaveBeenCalled();
  });

  it('lists cms authors when all=true', () => {
    controller.list('true');
    expect(authors.listCms).toHaveBeenCalled();
  });

  it('queues author translation after create', async () => {
    authors.create.mockResolvedValue({ id: 'a1', translationStatus: 'PENDING' });
    await controller.create({ nameBg: 'Author' } as never);
    expect(translation.enqueueAuthor).toHaveBeenCalledWith('a1');
  });

  it('deletes an author', async () => {
    authors.remove.mockResolvedValue({ ok: true, id: 'a1' });
    await expect(controller.remove('a1')).resolves.toEqual({
      ok: true,
      id: 'a1',
    });
  });
});
