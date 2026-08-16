import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { overrideGuards } from '../../test/helpers/guards';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  const analytics = { summary: jest.fn() };

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [{ provide: AnalyticsService, useValue: analytics }],
    });
    overrideGuards(builder, JwtAuthGuard);
    const module = await builder.compile();
    controller = module.get(AnalyticsController);
  });

  it('defaults summary range to today', () => {
    controller.summary(undefined);
    expect(analytics.summary).toHaveBeenCalledWith('today');
  });

  it('parses week range', () => {
    controller.summary('week');
    expect(analytics.summary).toHaveBeenCalledWith('week');
  });
});
