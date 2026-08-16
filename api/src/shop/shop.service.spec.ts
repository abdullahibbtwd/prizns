import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ShopOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { MailService } from '../mail/mail.service';
import { createMockConfig, createMockPrisma } from '../../test/helpers/mocks';
import { buildProductRow } from '../../test/helpers/factories';
import { ShopService } from './shop.service';

const mockCheckoutCreate = jest.fn().mockResolvedValue({
  id: 'cs_test',
  url: 'https://checkout.stripe.test/session',
});

jest.mock('stripe', () =>
  jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: mockCheckoutCreate } },
  })),
);

describe('ShopService', () => {
  let service: ShopService;
  let prisma: ReturnType<typeof createMockPrisma>;
  const storage = {
    publicUrlFor: jest.fn((key: string) => `https://cdn/${key}`),
    resolvePublicUrl: jest.fn((row: { url: string }) => row.url),
  };
  const mail = {
    isConfigured: jest.fn().mockReturnValue(false),
    send: jest.fn().mockResolvedValue({ ids: ['x'], recipientCount: 1 }),
  };

  const product = buildProductRow();

  const order = {
    id: 'order-1',
    publicId: 'PRZ-TEST01',
    email: 'buyer@example.com',
    status: ShopOrderStatus.PAID,
    paymentMethod: 'COD' as const,
    totalCents: 1500,
    currency: 'eur',
    estimatedArrival: '3–5 business days',
    paidAt: new Date(),
    shippedAt: null,
    deliveredAt: null,
    items: [
      {
        titleSnapshot: 'Journal',
        qty: 1,
        unitPriceCents: 1500,
        lineTotalCents: 1500,
      },
    ],
  };

  beforeEach(async () => {
    prisma = createMockPrisma({
      product: {
        findMany: jest.fn().mockResolvedValue([product]),
        findFirst: jest.fn().mockResolvedValue(product),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(product),
        update: jest.fn().mockResolvedValue(product),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      productGalleryItem: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn(),
      },
      shopOrder: {
        findUnique: jest.fn().mockResolvedValue(order),
        create: jest.fn().mockResolvedValue(order),
        update: jest.fn().mockResolvedValue(order),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (tx: typeof prisma) => unknown)(prisma);
        }
        return Promise.all(arg as Promise<unknown>[]);
      }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: createMockConfig({
            FEATURE_SHOP: 'true',
            PUBLIC_SITE_URL: 'https://prizni.bg',
            STRIPE_CURRENCY: 'eur',
          }),
        },
        { provide: StorageService, useValue: storage },
        { provide: MailService, useValue: mail },
      ],
    }).compile();

    service = module.get(ShopService);
  });

  it('is enabled when feature flag is true', () => {
    expect(service.isEnabled()).toBe(true);
  });

  it('throws when shop disabled', () => {
    expect(() =>
      new ShopService(
        prisma as never,
        createMockConfig({ FEATURE_SHOP: 'false' }) as never,
        storage as never,
        mail as never,
      ).assertEnabled(),
    ).toThrow(ServiceUnavailableException);
  });

  it('lists and fetches public products', async () => {
    const items = await service.listPublicProducts();
    expect(items).toHaveLength(1);
    expect(items[0]?.slug).toBe('journal');

    const one = await service.getPublicProduct('journal');
    expect(one.slug).toBe('journal');
  });

  it('throws when public product is missing', async () => {
    prisma.product.findFirst = jest.fn().mockResolvedValue(null);
    await expect(service.getPublicProduct('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('creates a CMS product', async () => {
    const created = await service.createProduct({
      titleBg: 'New Item',
      priceCents: 2000,
      stock: 5,
      allowCod: true,
    });
    expect(created.slug).toBeDefined();
    expect(prisma.product.create).toHaveBeenCalled();
  });

  it('rejects product price below minimum', async () => {
    await expect(
      service.createProduct({
        titleBg: 'Cheap',
        priceCents: 50,
        stock: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('places a COD order and tracks it', async () => {
    const placed = await service.createCodOrder(
      {
        items: [{ productId: product.id, qty: 1 }],
        email: 'buyer@example.com',
        name: 'Buyer',
        line1: 'Main St 1',
        city: 'Vidin',
        postal: '3700',
      },
      '127.0.0.1',
    );
    expect(placed.publicId).toBe('PRZ-TEST01');

    const tracked = await service.trackOrder(
      { publicId: 'PRZ-TEST01', email: 'buyer@example.com' },
      '127.0.0.1',
    );
    expect(tracked.items).toHaveLength(1);
  });

  it('requires Stripe for card checkout', async () => {
    await expect(
      service.createCheckout({ items: [{ productId: product.id, qty: 1 }] }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('creates Stripe checkout session when configured', async () => {
    const stripeService = new ShopService(
      prisma as never,
      createMockConfig({
        FEATURE_SHOP: 'true',
        PUBLIC_SITE_URL: 'https://prizni.bg',
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_CURRENCY: 'eur',
      }) as never,
      storage as never,
      mail as never,
    );
    prisma.shopOrder.create = jest.fn().mockResolvedValue({
      id: 'order-stripe',
      publicId: 'PRZ-STRIPE',
      items: [],
    });
    prisma.shopOrder.update = jest.fn().mockResolvedValue({});

    const result = await stripeService.createCheckout({
      items: [{ productId: product.id, qty: 1 }],
    });
    expect(result.url).toContain('stripe.test');
    expect(mockCheckoutCreate).toHaveBeenCalled();
  });

  it('updates a CMS product', async () => {
    prisma.product.findUnique = jest.fn().mockResolvedValue(product);
    const updated = await service.updateProduct('prod-1', {
      titleBg: 'Updated journal',
      priceCents: 1800,
    });
    expect(updated.slug).toBe('journal');
    expect(prisma.product.update).toHaveBeenCalled();
  });

  it('rejects update when product is missing', async () => {
    prisma.product.findUnique = jest.fn().mockResolvedValue(null);
    await expect(
      service.updateProduct('missing', { titleBg: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists CMS products', async () => {
    const items = await service.listCmsProducts();
    expect(items).toHaveLength(1);
  });

  it('gets CMS product by id', async () => {
    prisma.product.findUnique = jest.fn().mockResolvedValue(product);
    const row = await service.getCmsProduct('prod-1');
    expect(row.id).toBe('prod-1');
  });

  it('marks a pending Stripe order as paid on checkout completion', async () => {
    const pendingOrder = {
      ...order,
      status: ShopOrderStatus.PENDING,
      totalCents: 1500,
      currency: 'eur',
      items: [
        {
          productId: product.id,
          qty: 1,
          titleSnapshot: 'Journal',
        },
      ],
    };
    prisma.shopOrder.findUnique = jest.fn().mockResolvedValue(pendingOrder);
    prisma.product.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    prisma.shopOrder.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    prisma.$transaction = jest.fn(async (fn: (tx: typeof prisma) => unknown) =>
      fn(prisma),
    );

    await service.handleCheckoutCompleted({
      id: 'cs_paid',
      metadata: { kind: 'shop', orderId: pendingOrder.id },
      amount_total: 1500,
      currency: 'eur',
      customer_details: { email: 'buyer@example.com' },
    } as never);

    expect(prisma.shopOrder.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: ShopOrderStatus.PAID }),
      }),
    );
  });

  it('marks order failed when Stripe amount mismatches', async () => {
    const pendingOrder = {
      ...order,
      status: ShopOrderStatus.PENDING,
      totalCents: 1500,
      currency: 'eur',
      items: [],
    };
    prisma.shopOrder.findUnique = jest.fn().mockResolvedValue(pendingOrder);
    prisma.shopOrder.update = jest.fn().mockResolvedValue({});

    await service.handleCheckoutCompleted({
      id: 'cs_bad',
      metadata: { kind: 'shop', orderId: pendingOrder.id },
      amount_total: 999,
      currency: 'eur',
    } as never);

    expect(prisma.shopOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: ShopOrderStatus.FAILED },
      }),
    );
  });

  it('ignores checkout completion for already paid orders', async () => {
    const updateMany = jest.fn();
    prisma.shopOrder.findUnique = jest.fn().mockResolvedValue({
      ...order,
      status: ShopOrderStatus.PAID,
      items: [],
    });
    prisma.shopOrder.updateMany = updateMany;

    await service.handleCheckoutCompleted({
      id: 'cs_repeat',
      metadata: { kind: 'shop', orderId: order.id },
      amount_total: 1500,
      currency: 'eur',
    } as never);

    expect(updateMany).not.toHaveBeenCalled();
  });
});
