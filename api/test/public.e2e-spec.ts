import request from 'supertest';
import { DonationsService } from '../src/donations/donations.service';
import {
  closeE2eApp,
  createE2eApp,
  mockMailService,
  type E2eContext,
} from './helpers/e2e-app';
import { disconnectTestPrisma, resetE2eData } from './helpers/e2e-db';

describe('Public API (e2e)', () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await createE2eApp();
  }, 60_000);

  beforeEach(async () => {
    jest.clearAllMocks();
    await resetE2eData();
  });

  afterAll(async () => {
    await closeE2eApp(ctx);
    await disconnectTestPrisma();
  });

  describe('GET /api', () => {
    it('returns api info', () => {
      return request(ctx.app.getHttpServer())
        .get('/api')
        .expect(200)
        .expect({ name: 'prizn-api', status: 'ok' });
    });
  });

  describe('GET /api/health', () => {
    it('reports database, redis, and minio health', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.info).toMatchObject({
        database: expect.objectContaining({ status: 'up' }),
        redis: expect.objectContaining({ status: 'up' }),
        minio: expect.objectContaining({ status: 'up' }),
      });
    });
  });

  describe('POST /api/newsletter/subscribe', () => {
    it('subscribes a new email', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/newsletter/subscribe')
        .send({ email: 'reader@example.com', source: 'e2e' })
        .expect(201);

      expect(res.body.email).toBe('reader@example.com');
      expect(res.body.id).toBeDefined();
    });

    it('rejects duplicate subscriptions', async () => {
      await request(ctx.app.getHttpServer())
        .post('/api/newsletter/subscribe')
        .send({ email: 'dup@example.com' })
        .expect(201);

      await request(ctx.app.getHttpServer())
        .post('/api/newsletter/subscribe')
        .send({ email: 'dup@example.com' })
        .expect(409);
    });

    it('validates email format', () => {
      return request(ctx.app.getHttpServer())
        .post('/api/newsletter/subscribe')
        .send({ email: 'not-an-email' })
        .expect(400);
    });
  });

  describe('POST /api/contact', () => {
    it('creates a contact inquiry in the database', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/contact')
        .send({
          name: 'Jane Reader',
          email: 'jane@example.com',
          subject: 'Hello',
          message: 'I love your stories.',
        })
        .expect(201);

      expect(res.body.email).toBe('jane@example.com');
      expect(res.body.aiCategory).toBe('UNKNOWN');
    });

    it('silently accepts honeypot submissions', () => {
      return request(ctx.app.getHttpServer())
        .post('/api/contact')
        .send({
          name: 'Bot',
          email: 'bot@spam.test',
          subject: 'spam',
          message: 'spam',
          honeypot: 'filled',
        })
        .expect(201)
        .expect({ ok: true });
    });
  });

  describe('POST /api/partnerships', () => {
    it('creates a partnership inquiry', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/partnerships')
        .send({
          organization: 'Acme NGO',
          contactName: 'John Partner',
          email: 'john@acme.org',
          type: 'sponsor',
          message: 'We would like to collaborate.',
        })
        .expect(201);

      expect(res.body.organization).toBe('Acme NGO');
    });
  });

  describe('POST /api/analytics/beacon', () => {
    it('records a pageview and returns session ids', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/analytics/beacon')
        .set('User-Agent', 'e2e-test-agent')
        .send({
          visitorKey: 'visitor-e2e-key',
          event: 'pageview',
          path: '/stories/test-article',
          title: 'Test Article',
        })
        .expect(201);

      expect(res.body.sessionId).toBeDefined();
      expect(res.body.pageViewId).toBeDefined();
    });

    it('ignores cms paths', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/analytics/beacon')
        .send({
          visitorKey: 'visitor-cms-key',
          event: 'pageview',
          path: '/cms/dashboard',
        })
        .expect(201);

      expect(res.body).toEqual({ ignored: true });
    });

    it('records a click', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/analytics/beacon')
        .send({
          visitorKey: 'visitor-click-key',
          event: 'click',
          path: '/stories/test-article',
          href: '/support',
          label: 'Donate',
          kind: 'cta',
        })
        .expect(201);

      expect(res.body.sessionId).toBeDefined();
      expect(res.body.ignored).toBeUndefined();
    });
  });

  describe('GET /api/tags', () => {
    it('returns a tag list', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/tags')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('SEO endpoints', () => {
    it('serves robots.txt', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/robots.txt')
        .expect(200);

      expect(res.text).toContain('User-agent');
    });

    it('serves sitemap.xml', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/sitemap.xml')
        .expect(200);

      expect(res.text).toContain('urlset');
    });

    it('serves feed.json', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/feed.json')
        .expect(200);

      expect(res.body.version).toBeDefined();
    });
  });

  describe('POST /api/donations/checkout', () => {
    it('returns 503 when Stripe is not configured', async () => {
      const donations = ctx.moduleFixture.get(DonationsService);
      (donations as { stripe: unknown }).stripe = null;

      await request(ctx.app.getHttpServer())
        .post('/api/donations/checkout')
        .send({ amountBgn: 10 })
        .expect(503);
    });
  });

  describe('mail mock', () => {
    it('routes contact notifications through the mocked mail service', async () => {
      await request(ctx.app.getHttpServer())
        .post('/api/contact')
        .send({
          name: 'Mail Test',
          email: 'mail@example.com',
          subject: 'Hi',
          message: 'Testing mail mock.',
        })
        .expect(201);

      expect(mockMailService.send).toHaveBeenCalled();
    });
  });
});
