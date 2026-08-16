import { Test, TestingModule } from '@nestjs/testing';
import { PublicPartnershipsController } from './public-partnerships.controller';
import { PartnershipsService } from './partnerships.service';

describe('PublicPartnershipsController', () => {
  let controller: PublicPartnershipsController;
  const partnerships = { create: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PublicPartnershipsController],
      providers: [{ provide: PartnershipsService, useValue: partnerships }],
    }).compile();
    controller = module.get(PublicPartnershipsController);
  });

  it('creates partnership inquiry', () => {
    const dto = { name: 'Org', email: 'o@example.com' } as never;
    controller.create(dto);
    expect(partnerships.create).toHaveBeenCalledWith(dto);
  });
});
