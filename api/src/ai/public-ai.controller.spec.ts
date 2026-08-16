import { Test, TestingModule } from '@nestjs/testing';
import { PublicAiController } from './public-ai.controller';
import { AiService } from './ai.service';

describe('PublicAiController', () => {
  let controller: PublicAiController;
  const ai = {
    assertRateLimit: jest.fn(),
    explainRegionalContext: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PublicAiController],
      providers: [{ provide: AiService, useValue: ai }],
    }).compile();
    controller = module.get(PublicAiController);
  });

  it('rate limits and explains regional context', () => {
    const dto = { place: 'Vidin' } as never;
    const req = { ip: '127.0.0.1', headers: {} } as never;
    controller.regionalContext(dto, req);
    expect(ai.assertRateLimit).toHaveBeenCalled();
    expect(ai.explainRegionalContext).toHaveBeenCalledWith(dto);
  });
});
