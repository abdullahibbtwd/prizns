import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { loadTestEnv } from '../load-test-env';

let prisma: PrismaClient | null = null;
let resetChain: Promise<void> = Promise.resolve();

export function getTestPrisma(): PrismaClient {
  if (!prisma) {
    loadTestEnv();
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL missing for e2e tests');
    const adapter = new PrismaPg({ connectionString: url });
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

async function drainBullQueues() {
  loadTestEnv();
  const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  });
  try {
    await redis.connect();
    const prefixes = ['bull:translate:', 'bull:ai:', 'bull:tts:', 'bull:digest:'];
    for (const prefix of prefixes) {
      const keys = await redis.keys(`${prefix}*`);
      if (keys.length > 0) await redis.del(...keys);
    }
  } finally {
    await redis.quit();
  }
}

async function resetE2eDataInner() {
  await drainBullQueues();
  const db = getTestPrisma();

  // Sequential deletes — batch $transaction([...]) can overlap queries on the
  // pg driver adapter and cause FK races / partial resets between e2e suites.
  await db.$transaction(async (tx) => {
    await tx.pageView.deleteMany();
    await tx.analyticsSession.deleteMany();
    await tx.savedArticle.deleteMany();
    await tx.magicLinkToken.deleteMany();
    await tx.readerRefreshToken.deleteMany();
    await tx.reader.deleteMany();
    await tx.orderItem.deleteMany();
    await tx.shopOrder.deleteMany();
    await tx.productGalleryItem.deleteMany();
    await tx.product.deleteMany({ where: { slug: { not: 'e2e-test-mug' } } });
    await tx.articleReaction.deleteMany();
    await tx.articleTag.deleteMany();
    await tx.articleCategory.deleteMany();
    await tx.articleGalleryItem.deleteMany();
    await tx.seriesEpisode.deleteMany();
    await tx.donation.deleteMany();
    await tx.article.deleteMany();
    await tx.editorialTodo.deleteMany();
    await tx.newsletterSubscriber.deleteMany();
    await tx.contactInquiry.deleteMany();
    await tx.partnershipInquiry.deleteMany();
    await tx.refreshToken.deleteMany();
  });

  await drainBullQueues();
}

/** Clear tables touched by e2e tests. Keeps seeded admin user + e2e shop product. */
export async function resetE2eData() {
  const run = resetChain.then(() => resetE2eDataInner());
  resetChain = run.catch(() => undefined);
  await run;
}

export async function disconnectTestPrisma() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
