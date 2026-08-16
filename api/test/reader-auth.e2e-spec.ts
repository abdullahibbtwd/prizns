import request from 'supertest';
import { READER_AUTH_COOKIES } from '../src/reader-auth/reader-auth.types';
import {
  closeE2eApp,
  createE2eApp,
  mockMailService,
  type E2eContext,
} from './helpers/e2e-app';
import { disconnectTestPrisma, resetE2eData } from './helpers/e2e-db';
import { extractMagicLinkToken } from './helpers/e2e-seed';

describe('Reader auth API (e2e)', () => {
  let ctx: E2eContext;
  let readerAgent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    ctx = await createE2eApp({ FEATURE_READER_AUTH: 'true' });
    readerAgent = request.agent(ctx.app.getHttpServer());
  }, 60_000);

  beforeEach(async () => {
    jest.clearAllMocks();
    await resetE2eData();
    readerAgent = request.agent(ctx.app.getHttpServer());
  });

  afterAll(async () => {
    await closeE2eApp(ctx);
    await disconnectTestPrisma();
  });

  describe('POST /api/reader-auth/request + verify', () => {
    it('sends a magic link and verifies it to establish a session', async () => {
      const requested = await readerAgent
        .post('/api/reader-auth/request')
        .send({ email: 'reader@example.com', locale: 'en' })
        .expect(200);

      expect(requested.body).toEqual({
        ok: true,
        authenticated: false,
      });

      const token = extractMagicLinkToken(mockMailService.send);
      expect(token).toBeTruthy();

      const verified = await readerAgent
        .post('/api/reader-auth/verify')
        .send({ token })
        .expect(200);

      expect(verified.body.reader.email).toBe('reader@example.com');
      expect(verified.headers['set-cookie']).toEqual(
        expect.arrayContaining([
          expect.stringContaining(`${READER_AUTH_COOKIES.access}=`),
          expect.stringContaining(`${READER_AUTH_COOKIES.refresh}=`),
        ]),
      );

      const me = await readerAgent.get('/api/reader/me').expect(200);
      expect(me.body.reader.email).toBe('reader@example.com');
    });
  });

  describe('returning reader instant login', () => {
    it('authenticates immediately when the reader has logged in before', async () => {
      await readerAgent
        .post('/api/reader-auth/request')
        .send({ email: 'returning@example.com' })
        .expect(200);

      const token = extractMagicLinkToken(mockMailService.send);
      await readerAgent
        .post('/api/reader-auth/verify')
        .send({ token })
        .expect(200);

      const second = await request(ctx.app.getHttpServer())
        .post('/api/reader-auth/request')
        .send({ email: 'returning@example.com' })
        .expect(200);

      expect(second.body.authenticated).toBe(true);
      expect(second.body.reader.email).toBe('returning@example.com');
    });
  });

  describe('POST /api/reader-auth/logout', () => {
    it('clears the reader session', async () => {
      await readerAgent
        .post('/api/reader-auth/request')
        .send({ email: 'logout@example.com' })
        .expect(200);

      const token = extractMagicLinkToken(mockMailService.send);
      await readerAgent
        .post('/api/reader-auth/verify')
        .send({ token })
        .expect(200);

      await readerAgent.post('/api/reader-auth/logout').expect(200);
      await readerAgent.get('/api/reader/me').expect(401);
    });
  });

  describe('invalid magic link', () => {
    it('rejects an unknown token', () => {
      return request(ctx.app.getHttpServer())
        .post('/api/reader-auth/verify')
        .send({ token: 'not-a-valid-magic-link-token-value' })
        .expect(401);
    });
  });
});
