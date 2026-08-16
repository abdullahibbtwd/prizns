import { Test, TestingModule } from '@nestjs/testing';
import { DigestController } from './digest.controller';
import { DigestService } from './digest.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { overrideGuards } from '../../test/helpers/guards';

describe('DigestController', () => {
  let controller: DigestController;
  const digest = { preview: jest.fn(), history: jest.fn(), sendNow: jest.fn() };

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [DigestController],
      providers: [{ provide: DigestService, useValue: digest }],
    });
    overrideGuards(builder, JwtAuthGuard);
    const module = await builder.compile();
    controller = module.get(DigestController);
  });

  it('previews digest', () => {
    controller.preview('series-1');
    expect(digest.preview).toHaveBeenCalledWith('series-1');
  });

  it('returns history', () => {
    controller.history();
    expect(digest.history).toHaveBeenCalled();
  });

  it('sends digest', () => {
    const dto = { seriesId: 'series-1' } as never;
    controller.send(dto);
    expect(digest.sendNow).toHaveBeenCalledWith(dto);
  });
});
