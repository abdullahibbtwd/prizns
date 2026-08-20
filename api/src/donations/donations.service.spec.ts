import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DonationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ShopService } from '../shop/shop.service';
import { createMockConfig, createMockPrisma } from '../../test/helpers/mocks';
import { DonationsService } from './donations.service';

const mockCheckoutCreate = jest.fn().mockResolvedValue({
  id: 'cs_donation',
  url: 'https://checkout.stripe.test/donate',
});

const mockConstructEvent = jest.fn();

jest.mock('stripe', () =>
  jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: mockCheckoutCreate } },
    webhooks: { constructEvent: mockConstructEvent },
  })),
);

describe('DonationsService', () => {
  let service: DonationsService;
  let prisma: ReturnType<typeof createMockPrisma>;
  const shop = {
    isEnabled: jest.fn().mockReturnValue(false),
    handleCheckoutCompleted: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    prisma = createMockPrisma({
      donation: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({ id: 'don-1' }),
        update: jest.fn().mockResolvedValue({ id: 'don-1' }),
      },
      article: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonationsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: createMockConfig({ PUBLIC_SITE_URL: 'https://prizni.bg' }),
        },
        { provide: ShopService, useValue: shop },
      ],
    }).compile();

    service = module.get(DonationsService);
  });

  it('throws when stripe is not configured', async () => {
    await expect(
      service.createCheckout({ amountBgn: 10 }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects amounts below minimum', async () => {
    const withStripe = new DonationsService(
      prisma as never,
      createMockConfig({
        STRIPE_SECRET_KEY: 'sk_test_123',
        PUBLIC_SITE_URL: 'https://prizni.bg',
      }) as never,
      shop as never,
    );
    await expect(
      withStripe.createCheckout({ amountBgn: 0.5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates Stripe checkout for a valid donation', async () => {
    const withStripe = new DonationsService(
      prisma as never,
      createMockConfig({
        STRIPE_SECRET_KEY: 'sk_test_123',
        PUBLIC_SITE_URL: 'https://prizni.bg',
        STRIPE_CURRENCY: 'eur',
      }) as never,
      shop as never,
    );

    const result = await withStripe.createCheckout({
      amountBgn: 10,
      email: 'donor@example.com',
    });
    expect(result.url).toContain('stripe.test');
    expect(prisma.donation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountCents: 1000,
          currency: 'eur',
        }),
      }),
    );
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              currency: 'eur',
              unit_amount: 1000,
            }),
          }),
        ],
      }),
    );
  });

  it('requires published article when articleId is set', async () => {
    const withStripe = new DonationsService(
      prisma as never,
      createMockConfig({
        STRIPE_SECRET_KEY: 'sk_test_123',
        PUBLIC_SITE_URL: 'https://prizni.bg',
      }) as never,
      shop as never,
    );
    await expect(
      withStripe.createCheckout({ amountBgn: 10, articleId: 'missing' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists cms donations', async () => {
    const result = await service.listCms({ page: 1, status: DonationStatus.PAID });
    expect(result.total).toBe(2);
  });

  it('rejects webhook without signature', async () => {
    const withStripe = new DonationsService(
      prisma as never,
      createMockConfig({
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
      }) as never,
      shop as never,
    );
    await expect(
      withStripe.handleWebhook(Buffer.from('{}'), undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('marks donation completed on checkout.session.completed', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_done',
          metadata: { donationId: 'don-1' },
          payment_intent: 'pi_123',
        },
      },
    });

    const withStripe = new DonationsService(
      prisma as never,
      createMockConfig({
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
      }) as never,
      shop as never,
    );

    const result = await withStripe.handleWebhook(
      Buffer.from('{}'),
      'sig_test',
    );
    expect(result).toEqual({ received: true });
    expect(prisma.donation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'don-1' },
        data: expect.objectContaining({
          status: DonationStatus.COMPLETED,
        }),
      }),
    );
  });

  it('delegates shop checkout completion to ShopService', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_shop',
          metadata: { kind: 'shop', orderId: 'order-1' },
        },
      },
    });

    const withStripe = new DonationsService(
      prisma as never,
      createMockConfig({
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
      }) as never,
      shop as never,
    );

    await withStripe.handleWebhook(Buffer.from('{}'), 'sig_test');
    expect(shop.handleCheckoutCompleted).toHaveBeenCalled();
  });

  it('purges abandoned pending donations', async () => {
    prisma.donation.deleteMany = jest.fn().mockResolvedValue({ count: 3 });
    const purged = await service.purgeAbandonedPending(true);
    expect(purged).toBe(3);
  });

  it('returns cms donation trend buckets', async () => {
    prisma.donation.findMany = jest.fn().mockResolvedValue([
      {
        amountCents: 1000,
        createdAt: new Date('2026-08-01T12:00:00.000Z'),
      },
    ]);
    prisma.donation.aggregate = jest
      .fn()
      .mockResolvedValue({ _sum: { amountCents: 1000 } });
    const trend = await service.getCmsTrend('day');
    expect(trend.series.length).toBe(30);
    expect(trend.rangeBgn).toBeGreaterThanOrEqual(0);
  });

  it('rejects invalid webhook signatures', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('bad signature');
    });
    const withStripe = new DonationsService(
      prisma as never,
      createMockConfig({
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_WEBHOOK_SECRET: 'whsec_test',
      }) as never,
      shop as never,
    );
    await expect(
      withStripe.handleWebhook(Buffer.from('{}'), 'sig_bad'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
