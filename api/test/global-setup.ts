import 'reflect-metadata';
import { execSync } from 'child_process';
import { resolve } from 'path';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { loadTestEnv, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './load-test-env';

export default async function globalSetup() {
  loadTestEnv();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL missing — check api/test/.env.test');
  }

  let prisma: PrismaClient | null = null;
  try {
    const adapter = new PrismaPg({ connectionString: databaseUrl });
    prisma = new PrismaClient({ adapter });
    await prisma.$connect();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `E2E test database unavailable (${message}).\n` +
        'Start test infrastructure:\n' +
        '  docker compose -f docker-compose.test.yml up -d --wait\n' +
        'Then run:\n' +
        '  npm run test:e2e',
    );
  } finally {
    await prisma?.$disconnect();
  }

  const apiRoot = resolve(__dirname, '..');
  execSync('npx prisma migrate deploy', {
    cwd: apiRoot,
    env: process.env,
    stdio: 'inherit',
  });

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const seedPrisma = new PrismaClient({ adapter });
  try {
    const passwordHash = await bcrypt.hash(E2E_ADMIN_PASSWORD, 10);
    await seedPrisma.user.upsert({
      where: { email: E2E_ADMIN_EMAIL },
      create: {
        email: E2E_ADMIN_EMAIL,
        passwordHash,
        name: 'E2E Admin',
        role: 'ADMIN',
        isActive: true,
        emailVerifiedAt: new Date(),
      },
      update: {
        passwordHash,
        name: 'E2E Admin',
        role: 'ADMIN',
        isActive: true,
        emailVerifiedAt: new Date(),
      },
    });
  } finally {
    await seedPrisma.$disconnect();
  }

  process.env.E2E_READY = 'true';
}
