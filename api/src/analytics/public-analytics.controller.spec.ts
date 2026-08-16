import { Test, TestingModule } from '@nestjs/testing';
import { PublicAnalyticsController } from './public-analytics.controller';
import { AnalyticsService } from './analytics.service';

describe('PublicAnalyticsController', () => {
  let controller: PublicAnalyticsController;
  const analytics = { beacon: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PublicAnalyticsController],
      providers: [{ provide: AnalyticsService, useValue: analytics }],
    }).compile();
    controller = module.get(PublicAnalyticsController);
  });

  it('delegates beacon to analytics service', () => {
    const dto = { path: '/stories/test' };
    controller.beacon(dto, 'jest-agent');
    expect(analytics.beacon).toHaveBeenCalledWith(dto, 'jest-agent');
  });
});
