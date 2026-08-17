import { resolve } from 'path';
import { config } from 'dotenv';

const INTEGRATION_KEYS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'GEMINI_API_KEY',
  'RESEND_API_KEY',
] as const;

/** Load test environment variables before AppModule / Prisma init. */
export function loadTestEnv() {
  for (const key of INTEGRATION_KEYS) {
    delete process.env[key];
  }
  config({
    path: resolve(__dirname, '.env.test'),
    override: false,
    quiet: true,
  });
  for (const key of INTEGRATION_KEYS) {
    if (process.env[key] === '') delete process.env[key];
  }
  // Required by AppModule env validation; .env is gitignored so CI/local
  // e2e cannot rely on it being present.
  if (!process.env.API_PORT) {
    process.env.API_PORT = '3003';
  }
}

export const E2E_ADMIN_EMAIL =
  process.env.E2E_ADMIN_EMAIL ?? 'e2e-admin@prizni.test';
export const E2E_ADMIN_PASSWORD =
  process.env.E2E_ADMIN_PASSWORD ?? 'TestPassword123!';
