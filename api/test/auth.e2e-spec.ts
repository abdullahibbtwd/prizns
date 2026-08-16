import request from 'supertest';
import { AUTH_COOKIES } from '../src/auth/auth.types';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './load-test-env';
import {
  closeE2eApp,
  createE2eApp,
  type E2eContext,
} from './helpers/e2e-app';
import { disconnectTestPrisma, resetE2eData } from './helpers/e2e-db';

describe('Auth API (e2e)', () => {
  let ctx: E2eContext;
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    ctx = await createE2eApp();
    agent = request.agent(ctx.app.getHttpServer());
  }, 60_000);

  beforeEach(async () => {
    await resetE2eData();
  });

  afterAll(async () => {
    await closeE2eApp(ctx);
    await disconnectTestPrisma();
  });

  describe('POST /api/auth/login', () => {
    it('authenticates the seeded admin and sets cookies', async () => {
      const res = await agent
        .post('/api/auth/login')
        .send({
          email: E2E_ADMIN_EMAIL,
          password: E2E_ADMIN_PASSWORD,
        })
        .expect(200);

      expect(res.body.user.email).toBe(E2E_ADMIN_EMAIL);
      expect(res.body.user.role).toBe('ADMIN');

      const cookies = res.headers['set-cookie'];
      expect(cookies).toEqual(
        expect.arrayContaining([
          expect.stringContaining(`${AUTH_COOKIES.access}=`),
          expect.stringContaining(`${AUTH_COOKIES.refresh}=`),
        ]),
      );
    });

    it('rejects invalid credentials', () => {
      return request(ctx.app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: E2E_ADMIN_EMAIL,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('validates login payload', () => {
      return request(ctx.app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'not-email', password: 'short' })
        .expect(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns the current user when authenticated', async () => {
      await agent
        .post('/api/auth/login')
        .send({
          email: E2E_ADMIN_EMAIL,
          password: E2E_ADMIN_PASSWORD,
        })
        .expect(200);

      const res = await agent.get('/api/auth/me').expect(200);
      expect(res.body.user.email).toBe(E2E_ADMIN_EMAIL);
    });

    it('returns 401 without auth cookies', () => {
      return request(ctx.app.getHttpServer()).get('/api/auth/me').expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('clears the session', async () => {
      await agent
        .post('/api/auth/login')
        .send({
          email: E2E_ADMIN_EMAIL,
          password: E2E_ADMIN_PASSWORD,
        })
        .expect(200);

      await agent.post('/api/auth/logout').expect(200);
      await agent.get('/api/auth/me').expect(401);
    });
  });
});
