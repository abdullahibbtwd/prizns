import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { overrideGuards } from '../../test/helpers/guards';

describe('AiController', () => {
  let controller: AiController;
  const ai = { suggest: jest.fn() };

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [AiController],
      providers: [{ provide: AiService, useValue: ai }],
    });
    overrideGuards(builder, JwtAuthGuard);
    const module = await builder.compile();
    controller = module.get(AiController);
  });

  it('delegates suggest to ai service', () => {
    const dto = { prompt: 'headline', field: 'title' } as never;
    controller.suggest(dto);
    expect(ai.suggest).toHaveBeenCalledWith(dto);
  });
});
