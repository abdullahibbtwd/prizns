import request from 'supertest';
import { resetRateLimits } from '../../src/common/rate-limit';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from '../load-test-env';
import { getTestPrisma } from './e2e-db';

export async function loginAdminAgent(
  server: Parameters<typeof request>[0],
): Promise<ReturnType<typeof request.agent>> {
  resetRateLimits('auth-login');
  const agent = request.agent(server);
  await agent
    .post('/api/auth/login')
    .send({
      email: E2E_ADMIN_EMAIL,
      password: E2E_ADMIN_PASSWORD,
    })
    .expect(200);
  return agent;
}

export async function seedTestProduct() {
  const db = getTestPrisma();
  return db.product.upsert({
    where: { slug: 'e2e-test-mug' },
    create: {
      slug: 'e2e-test-mug',
      titleBg: 'E2E Test Mug',
      titleEn: 'E2E Test Mug',
      descriptionBg: 'Integration test product',
      priceCents: 1500,
      currency: 'eur',
      stock: 10,
      active: true,
      allowCod: true,
      estimatedArrivalMinDays: 3,
      estimatedArrivalMaxDays: 5,
      estimatedArrivalDayType: 'BUSINESS',
      estimatedArrivalBg: '3–5 работни дни',
      estimatedArrivalEn: '3–5 business days',
    },
    update: {
      titleBg: 'E2E Test Mug',
      priceCents: 1500,
      stock: 10,
      active: true,
      allowCod: true,
    },
  });
}

/** Pull the magic-link token from the most recent mocked mail send. */
export function extractMagicLinkToken(
  sendMock: jest.Mock,
): string | null {
  const calls = sendMock.mock.calls as Array<
    [{ html?: string; text?: string }]
  >;
  const last = calls[calls.length - 1]?.[0];
  if (!last) return null;
  const content = `${last.html ?? ''}\n${last.text ?? ''}`;
  const match = content.match(/token=([^"&\s]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
