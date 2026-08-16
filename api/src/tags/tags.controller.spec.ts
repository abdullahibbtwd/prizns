import { Test, TestingModule } from '@nestjs/testing';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { overrideGuards } from '../../test/helpers/guards';

describe('TagsController', () => {
  let controller: TagsController;
  const tags = {
    listPublic: jest.fn(),
    listCms: jest.fn(),
    listMapPins: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    geocodeTag: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [TagsController],
      providers: [{ provide: TagsService, useValue: tags }],
    });
    overrideGuards(builder, JwtAuthGuard);
    const module = await builder.compile();
    controller = module.get(TagsController);
  });

  it('lists public tags', () => {
    controller.listPublic('place');
    expect(tags.listPublic).toHaveBeenCalledWith('place');
  });

  it('lists map pins', () => {
    controller.listMap();
    expect(tags.listMapPins).toHaveBeenCalled();
  });

  it('creates cms tag', () => {
    const dto = { kind: 'PLACE', nameBg: 'Vidin' } as never;
    controller.create(dto);
    expect(tags.create).toHaveBeenCalledWith(dto);
  });

  it('removes cms tag', () => {
    controller.remove('tag-1');
    expect(tags.remove).toHaveBeenCalledWith('tag-1');
  });
});
