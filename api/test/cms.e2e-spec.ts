import request from 'supertest';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './load-test-env';
import {
  closeE2eApp,
  createE2eApp,
  type E2eContext,
} from './helpers/e2e-app';
import { disconnectTestPrisma, resetE2eData } from './helpers/e2e-db';

describe('CMS API (e2e)', () => {
  let ctx: E2eContext;
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    ctx = await createE2eApp();
    agent = request.agent(ctx.app.getHttpServer());
    await agent
      .post('/api/auth/login')
      .send({
        email: E2E_ADMIN_EMAIL,
        password: E2E_ADMIN_PASSWORD,
      })
      .expect(200);
  }, 60_000);

  beforeEach(async () => {
    await resetE2eData();
    // Re-login after reset clears refresh tokens but cookies may still work
    // until access token expires — refresh session for cms/todos ownership.
    await agent
      .post('/api/auth/login')
      .send({
        email: E2E_ADMIN_EMAIL,
        password: E2E_ADMIN_PASSWORD,
      })
      .expect(200);
  });

  afterAll(async () => {
    await closeE2eApp(ctx);
    await disconnectTestPrisma();
  });

  describe('GET /api/cms/todos', () => {
    it('starts with an empty todo list', async () => {
      const res = await agent.get('/api/cms/todos').expect(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('POST /api/cms/todos', () => {
    it('creates, updates, and deletes a todo', async () => {
      const created = await agent
        .post('/api/cms/todos')
        .send({ title: 'Write e2e tests' })
        .expect(201);

      expect(created.body.title).toBe('Write e2e tests');
      expect(created.body.done).toBe(false);

      const listed = await agent.get('/api/cms/todos').expect(200);
      expect(listed.body).toHaveLength(1);

      const updated = await agent
        .patch(`/api/cms/todos/${created.body.id}`)
        .send({ done: true })
        .expect(200);

      expect(updated.body.done).toBe(true);

      await agent.delete(`/api/cms/todos/${created.body.id}`).expect(200);

      const afterDelete = await agent.get('/api/cms/todos').expect(200);
      expect(afterDelete.body).toEqual([]);
    });
  });

  describe('GET /api/cms/newsletter/subscribers', () => {
    it('lists newsletter subscribers from the database', async () => {
      await request(ctx.app.getHttpServer())
        .post('/api/newsletter/subscribe')
        .send({ email: 'cms-list@example.com' })
        .expect(201);

      const res = await agent
        .get('/api/cms/newsletter/subscribers')
        .expect(200);

      expect(res.body.items.some((row: { email: string }) => row.email === 'cms-list@example.com')).toBe(true);
    });
  });

  describe('GET /api/cms/contact', () => {
    it('lists contact inquiries', async () => {
      await request(ctx.app.getHttpServer())
        .post('/api/contact')
        .send({
          name: 'CMS List',
          email: 'cms-contact@example.com',
          subject: 'Question',
          message: 'Hello editors.',
        })
        .expect(201);

      const res = await agent.get('/api/cms/contact').expect(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('unauthenticated CMS access', () => {
    it('returns 401 for protected routes', () => {
      return request(ctx.app.getHttpServer())
        .get('/api/cms/todos')
        .expect(401);
    });
  });
});
