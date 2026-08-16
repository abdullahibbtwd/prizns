import request from 'supertest';
import {
  closeE2eApp,
  createE2eApp,
  type E2eContext,
} from './helpers/e2e-app';
import { disconnectTestPrisma } from './helpers/e2e-db';

describe('AppController (e2e)', () => {
  let ctx: E2eContext;

  beforeAll(async () => {
    ctx = await createE2eApp();
  }, 60_000);

  afterAll(async () => {
    await closeE2eApp(ctx);
    await disconnectTestPrisma();
  });

  it('/api (GET)', () => {
    return request(ctx.app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect({ name: 'prizn-api', status: 'ok' });
  });
});
