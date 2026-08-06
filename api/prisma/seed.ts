import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedJournalContent } from './seed-journal';

config({ path: resolve(__dirname, '../../.env') });
config({ path: resolve(process.cwd(), '../.env') });
config({ path: resolve(process.cwd(), '.env') });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@prizn.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? 'ChangeMeAdmin123!';
  const name = process.env.ADMIN_NAME ?? 'Prizn Admin';

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing');
  }

  if (password.length < 10) {
    throw new Error('ADMIN_PASSWORD must be at least 10 characters');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      name,
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      email,
      passwordHash,
      name,
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log(`Seeded admin user: ${user.email} (${user.role})`);

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

  await seedJournalContent(prisma);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
