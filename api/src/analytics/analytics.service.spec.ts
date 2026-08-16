import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { resetRateLimits } from '../common/rate-limit';
import { createMockPrisma } from '../../test/helpers/mocks';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    resetRateLimits('analytics-click');
    prisma = createMockPrisma({
      analyticsSession: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'sess-1' }),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
      },
      pageView: {
        create: jest.fn().mockResolvedValue({ id: 'pv-1' }),
        update: jest.fn().mockResolvedValue({ id: 'pv-1' }),
        count: jest.fn().mockResolvedValue(10),
        aggregate: jest.fn().mockResolvedValue({
          _avg: { dwellMs: 5000 },
          _sum: { dwellMs: 50000 },
        }),
        findMany: jest.fn().mockResolvedValue([
          { session: { visitorKey: 'visitor-1' } },
        ]),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      analyticsClick: {
        create: jest.fn().mockResolvedValue({ id: 'clk-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(AnalyticsService);
  });

  it('ignores cms paths in beacon', async () => {
    const result = await service.beacon({ path: '/cms/dashboard' });
    expect(result).toEqual({ ignored: true });
  });

  it('records public page beacon', async () => {
    const result = await service.beacon({
      path: '/stories/test',
      visitorKey: 'visitor-1',
      event: 'pageview',
    });
    expect(result).toHaveProperty('sessionId', 'sess-1');
  });

  it('returns summary for today', async () => {
    const summary = await service.summary('today');
    expect(summary).toHaveProperty('pageviews');
    expect(summary).toHaveProperty('visitors');
    expect(summary.topClicks).toEqual([]);
  });

  it('records a click beacon', async () => {
    const result = await service.beacon({
      path: '/stories/test',
      visitorKey: 'visitor-1',
      event: 'click',
      href: '/support',
      label: 'Donate',
      kind: 'cta',
    });
    expect(result).toEqual({ sessionId: 'sess-1' });
    expect(prisma.analyticsClick.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          href: '/support',
          kind: 'cta',
          label: 'Donate',
        }),
      }),
    );
  });

  it('ignores javascript click hrefs', async () => {
    const result = await service.beacon({
      path: '/stories/test',
      visitorKey: 'visitor-1',
      event: 'click',
      href: 'javascript:void(0)',
    });
    expect(result).toEqual({ sessionId: 'sess-1', ignored: true });
    expect(prisma.analyticsClick.create).not.toHaveBeenCalled();
  });
});
