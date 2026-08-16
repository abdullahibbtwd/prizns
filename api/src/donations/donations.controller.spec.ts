import { Test, TestingModule } from '@nestjs/testing';
import { DonationsController } from './donations.controller';
import { DonationsService } from './donations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { overrideGuards } from '../../test/helpers/guards';

describe('DonationsController', () => {
  let controller: DonationsController;
  const donations = { getCmsTrend: jest.fn(), listCms: jest.fn() };

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [DonationsController],
      providers: [{ provide: DonationsService, useValue: donations }],
    });
    overrideGuards(builder, JwtAuthGuard);
    const module = await builder.compile();
    controller = module.get(DonationsController);
  });

  it('defaults trend granularity to day', () => {
    controller.trend(undefined);
    expect(donations.getCmsTrend).toHaveBeenCalledWith('day');
  });

  it('lists donations with parsed status', () => {
    controller.list('1', '10', 'PAID');
    expect(donations.listCms).toHaveBeenCalled();
  });
});
