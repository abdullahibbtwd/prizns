import { Test, TestingModule } from '@nestjs/testing';
import { PublicAnalyticsController } from './public-analytics.controller';
import { AnalyticsService } from './analytics.service';

describe('PublicAnalyticsController', () => {
  let controller: PublicAnalyticsController;
  const analytics = { beacon: jest.fn(), popularStories: jest.fn() };

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

  it('delegates popular stories with a numeric limit', () => {
    controller.popular('5');
    expect(analytics.popularStories).toHaveBeenCalledWith(5);
  });

  it('defaults popular stories limit when missing', () => {
    controller.popular();
    expect(analytics.popularStories).toHaveBeenCalledWith(5);
  });
});
