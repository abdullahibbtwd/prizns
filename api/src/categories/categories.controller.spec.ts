import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { TranslationService } from '../translation/translation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { overrideGuards } from '../../test/helpers/guards';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  const categories = {
    list: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const translation = { enqueueCategory: jest.fn() };

  beforeEach(async () => {
    categories.create.mockReset();
    translation.enqueueCategory.mockReset();
    const builder = Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        { provide: CategoriesService, useValue: categories },
        { provide: TranslationService, useValue: translation },
      ],
    });
    overrideGuards(builder, JwtAuthGuard);
    const module = await builder.compile();
    controller = module.get(CategoriesController);
  });

  it('lists categories', () => {
    controller.listCms();
    expect(categories.list).toHaveBeenCalled();
  });

  it('creates and queues translation', async () => {
    categories.create.mockResolvedValue({
      id: 'c1',
      translationStatus: 'PENDING',
    });
    await controller.create({ nameBg: 'Видин' });
    expect(translation.enqueueCategory).toHaveBeenCalledWith('c1');
  });

  it('removes a category', () => {
    controller.remove('c1');
    expect(categories.remove).toHaveBeenCalledWith('c1');
  });
});
