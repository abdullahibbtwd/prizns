import request from 'supertest';
import {
  closeE2eApp,
  createE2eApp,
  type E2eContext,
} from './helpers/e2e-app';
import { disconnectTestPrisma, resetE2eData } from './helpers/e2e-db';
import { loginAdminAgent } from './helpers/e2e-seed';

describe('Articles CMS API (e2e)', () => {
  let ctx: E2eContext;
  let adminAgent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    ctx = await createE2eApp();
    adminAgent = await loginAdminAgent(ctx.app.getHttpServer());
  }, 60_000);

  beforeEach(async () => {
    await resetE2eData();
    adminAgent = await loginAdminAgent(ctx.app.getHttpServer());
  });

  afterAll(async () => {
    await closeE2eApp(ctx);
    await disconnectTestPrisma();
  });

  describe('CMS article CRUD', () => {
    it('creates, reads, updates, publishes, and deletes an article', async () => {
      const created = await adminAgent
        .post('/api/cms/articles')
        .send({
          section: 'places',
          categoryBg: 'E2E',
          titleBg: 'E2E Test Story',
          subtitleBg: 'A draft for integration tests',
          body: [{ type: 'paragraph', text: 'Hello from e2e.' }],
        })
        .expect(201);

      expect(created.body.titleBg).toBe('E2E Test Story');
      expect(created.body.status).toBe('DRAFT');
      expect(created.body.slug).toBeDefined();

      const articleId = created.body.id as string;

      const fetched = await adminAgent
        .get(`/api/cms/articles/${articleId}`)
        .expect(200);
      expect(fetched.body.id).toBe(articleId);

      const updated = await adminAgent
        .patch(`/api/cms/articles/${articleId}`)
        .send({ titleBg: 'E2E Updated Story' })
        .expect(200);
      expect(updated.body.titleBg).toBe('E2E Updated Story');

      const published = await adminAgent
        .patch(`/api/cms/articles/${articleId}`)
        .send({ status: 'PUBLISHED' })
        .expect(200);
      expect(published.body.status).toBe('PUBLISHED');

      const publicSlug = published.body.slug as string;
      const publicRes = await request(ctx.app.getHttpServer())
        .get(`/api/articles/places/${publicSlug}`)
        .expect(200);
      expect(publicRes.body.titleBg).toBe('E2E Updated Story');

      const listed = await request(ctx.app.getHttpServer())
        .get('/api/articles?section=places')
        .expect(200);
      expect(
        listed.body.some((a: { slug: string }) => a.slug === publicSlug),
      ).toBe(true);

      await adminAgent.delete(`/api/cms/articles/${articleId}`).expect(200);

      await request(ctx.app.getHttpServer())
        .get(`/api/articles/places/${publicSlug}`)
        .expect(404);
    });
  });

  describe('GET /api/cms/articles', () => {
    it('lists articles for authenticated editors', async () => {
      await adminAgent
        .post('/api/cms/articles')
        .send({
          section: 'news',
          categoryBg: 'News',
          titleBg: 'List Test Article',
        })
        .expect(201);

      const res = await adminAgent.get('/api/cms/articles').expect(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('unauthenticated access', () => {
    it('returns 401 for CMS article routes', () => {
      return request(ctx.app.getHttpServer())
        .get('/api/cms/articles')
        .expect(401);
    });
  });
});
