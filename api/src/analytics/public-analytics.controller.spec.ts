import { Test, TestingModule } from '@nestjs/testing';
import { AUTH_COOKIES } from '../auth/auth.types';
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
    analytics.beacon.mockClear();
  });

  it('delegates beacon with CMS cookie and client IP context', () => {
    const dto = { path: '/stories/test' };
    const req = {
      cookies: { [AUTH_COOKIES.access]: 'staff-token' },
      headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' },
      ip: '127.0.0.1',
    } as never;
    controller.beacon(dto, req, 'jest-agent');
    expect(analytics.beacon).toHaveBeenCalledWith(dto, 'jest-agent', {
      cmsAccessToken: 'staff-token',
      clientIp: '203.0.113.9',
    });
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
