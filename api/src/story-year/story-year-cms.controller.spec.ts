import { Test, TestingModule } from '@nestjs/testing';
import { StoryYearCmsController } from './story-year-cms.controller';
import { StoryYearService } from './story-year.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { overrideGuards } from '../../test/helpers/guards';

describe('StoryYearCmsController', () => {
  let controller: StoryYearCmsController;
  const storyYear = {
    listCms: jest.fn(),
    getCms: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    setNominations: jest.fn(),
  };

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [StoryYearCmsController],
      providers: [{ provide: StoryYearService, useValue: storyYear }],
    });
    overrideGuards(builder, JwtAuthGuard, RolesGuard);
    const module = await builder.compile();
    controller = module.get(StoryYearCmsController);
  });

  it('lists campaigns', () => {
    controller.list();
    expect(storyYear.listCms).toHaveBeenCalled();
  });

  it('creates campaign', () => {
    const dto = { year: 2026, titleBg: 'Campaign' } as never;
    controller.create(dto);
    expect(storyYear.create).toHaveBeenCalledWith(dto);
  });
});
