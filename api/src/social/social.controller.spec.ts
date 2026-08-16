import { Test, TestingModule } from '@nestjs/testing';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { overrideGuards } from '../../test/helpers/guards';

describe('SocialController', () => {
  let controller: SocialController;
  const social = {
    list: jest.fn(),
    getPlatformSettings: jest.fn(),
    savePlatformSettings: jest.fn(),
    generate: jest.fn(),
    update: jest.fn(),
    approve: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [SocialController],
      providers: [{ provide: SocialService, useValue: social }],
    });
    overrideGuards(builder, JwtAuthGuard);
    const module = await builder.compile();
    controller = module.get(SocialController);
  });

  it('lists social posts', () => {
    controller.list('DRAFT', 'art-1');
    expect(social.list).toHaveBeenCalledWith({
      status: 'DRAFT',
      articleId: 'art-1',
    });
  });

  it('generates social copy', () => {
    const dto = { articleId: 'art-1' } as never;
    controller.generate(dto);
    expect(social.generate).toHaveBeenCalledWith(dto);
  });
});
