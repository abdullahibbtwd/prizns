import { Test, TestingModule } from '@nestjs/testing';
import { PartnershipsController } from './partnerships.controller';
import { PartnershipsService } from './partnerships.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { overrideGuards } from '../../test/helpers/guards';

describe('PartnershipsController', () => {
  let controller: PartnershipsController;
  const partnerships = { list: jest.fn(), getById: jest.fn(), update: jest.fn() };

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [PartnershipsController],
      providers: [{ provide: PartnershipsService, useValue: partnerships }],
    });
    overrideGuards(builder, JwtAuthGuard);
    const module = await builder.compile();
    controller = module.get(PartnershipsController);
  });

  it('lists partnerships with parsed status', () => {
    controller.list('1', '10', 'acme', 'NEW');
    expect(partnerships.list).toHaveBeenCalled();
  });

  it('gets partnership by id', () => {
    controller.get('p1');
    expect(partnerships.getById).toHaveBeenCalledWith('p1');
  });
});
