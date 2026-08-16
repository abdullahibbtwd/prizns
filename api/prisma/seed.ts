import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedCategories } from './seed-categories';

config({ path: resolve(__dirname, '../../.env') });
config({ path: resolve(process.cwd(), '../.env') });
config({ path: resolve(process.cwd(), '.env') });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const BLOCKED_ADMIN_PASSWORDS = new Set([
  'ChangeMeAdmin123!',
  'changeme',
  'password',
  'admin123456',
]);

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function assertProductionAdminPassword(password: string) {
  if (!isProduction()) return;

  if (BLOCKED_ADMIN_PASSWORDS.has(password)) {
    throw new Error(
      'ADMIN_PASSWORD must not use the default example value in production.',
    );
  }

  if (password.length < 16) {
    throw new Error('ADMIN_PASSWORD must be at least 16 characters in production.');
  }
}

async function seedAdminUser() {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@prizn.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? 'ChangeMeAdmin123!';
  const name = process.env.ADMIN_NAME ?? 'Prizn Admin';

  assertProductionAdminPassword(password);

  if (password.length < 10) {
    throw new Error('ADMIN_PASSWORD must be at least 10 characters');
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing && isProduction()) {
    const user = await prisma.user.update({
      where: { email },
      data: {
        name,
        role: 'ADMIN',
        isActive: true,
        emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
      },
    });
    console.log(`Production seed: kept existing admin password for ${user.email}`);
    return user;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      name,
      role: 'ADMIN',
      isActive: true,
      emailVerifiedAt: existing?.emailVerifiedAt ?? new Date(),
    },
    create: {
      email,
      passwordHash,
      name,
      role: 'ADMIN',
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`Seeded admin user: ${user.email} (${user.role})`);
  return user;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing');
  }

  await seedAdminUser();

  const author = await prisma.author.upsert({
    where: { slug: 'prizn-desk' },
    update: {
      nameBg: 'Редакция Призни',
      nameEn: 'PRIZN Desk',
      roleBg: 'Редакция',
      roleEn: 'Editorial desk',
      isActive: true,
    },
    create: {
      slug: 'prizn-desk',
      nameBg: 'Редакция Призни',
      nameEn: 'PRIZN Desk',
      roleBg: 'Редакция',
      roleEn: 'Editorial desk',
      locationBg: 'Северозападна България',
      locationEn: 'Northwest Bulgaria',
      bioBg: 'Редакционният екип на Призни.',
      bioEn: 'The PRIZN editorial team.',
      aliases: ['PRIZNI Audio Desk', 'PRIZN Desk'],
    },
  });

  console.log(`Seeded author: ${author.slug}`);

  await seedCategories(prisma);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
