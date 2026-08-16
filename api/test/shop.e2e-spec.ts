import request from 'supertest';
import { ShopService } from '../src/shop/shop.service';
import {
  closeE2eApp,
  createE2eApp,
  mockMailService,
  type E2eContext,
} from './helpers/e2e-app';
import { disconnectTestPrisma, resetE2eData } from './helpers/e2e-db';
import { loginAdminAgent, seedTestProduct } from './helpers/e2e-seed';

describe('Shop API (e2e)', () => {
  let ctx: E2eContext;
  let productId: string;
  let adminAgent: ReturnType<typeof request.agent>;
  let shopService: ShopService;

  beforeAll(async () => {
    ctx = await createE2eApp({ FEATURE_SHOP: 'true' });
    shopService = ctx.moduleFixture.get(ShopService);
    jest.spyOn(shopService, 'isEnabled').mockReturnValue(true);
    const product = await seedTestProduct();
    productId = product.id;
    adminAgent = await loginAdminAgent(ctx.app.getHttpServer());
  }, 60_000);

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(shopService, 'isEnabled').mockReturnValue(true);
    await resetE2eData();
    const product = await seedTestProduct();
    productId = product.id;
    adminAgent = await loginAdminAgent(ctx.app.getHttpServer());
  });

  afterAll(async () => {
    await closeE2eApp(ctx);
    await disconnectTestPrisma();
  });

  describe('GET /api/shop/products', () => {
    it('lists active products', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/shop/products')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((p: { slug: string }) => p.slug === 'e2e-test-mug')).toBe(
        true,
      );
    });
  });

  describe('GET /api/shop/products/:slug', () => {
    it('returns a product by slug', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/shop/products/e2e-test-mug')
        .expect(200);

      expect(res.body.slug).toBe('e2e-test-mug');
      expect(res.body.priceCents).toBe(1500);
    });
  });

  describe('POST /api/shop/checkout/cod', () => {
    it('places a cash-on-delivery order and tracks it', async () => {
      const order = await request(ctx.app.getHttpServer())
        .post('/api/shop/checkout/cod')
        .send({
          items: [{ productId, qty: 1 }],
          email: 'buyer@example.com',
          name: 'Test Buyer',
          line1: '123 Main St',
          city: 'Vidin',
          postal: '3700',
          country: 'BG',
        })
        .expect(201);

      expect(order.body.publicId).toMatch(/^PRZ-/);
      expect(order.body.status).toBe('PAID');
      expect(mockMailService.send).toHaveBeenCalled();

      const tracked = await request(ctx.app.getHttpServer())
        .post('/api/shop/orders/track')
        .send({
          publicId: order.body.publicId,
          email: 'buyer@example.com',
        })
        .expect(201);

      expect(tracked.body.publicId).toBe(order.body.publicId);
      expect(tracked.body.items).toHaveLength(1);
    });
  });

  describe('POST /api/shop/checkout', () => {
    it('returns 503 when Stripe is not configured', async () => {
      const shop = ctx.moduleFixture.get(ShopService);
      (shop as { stripe: unknown }).stripe = null;

      await request(ctx.app.getHttpServer())
        .post('/api/shop/checkout')
        .send({ items: [{ productId, qty: 1 }] })
        .expect(503);
    });
  });

  describe('GET /api/cms/shop/products', () => {
    it('lists products for authenticated editors', async () => {
      const res = await adminAgent.get('/api/cms/shop/products').expect(200);
      expect(res.body.some((p: { slug: string }) => p.slug === 'e2e-test-mug')).toBe(
        true,
      );
    });
  });

  describe('shop disabled', () => {
    it('returns 503 when FEATURE_SHOP is off', async () => {
      const disabledCtx = await createE2eApp({ FEATURE_SHOP: 'false' });
      try {
        await request(disabledCtx.app.getHttpServer())
          .get('/api/shop/products')
          .expect(503);
      } finally {
        await closeE2eApp(disabledCtx);
      }
    });
  });
});
