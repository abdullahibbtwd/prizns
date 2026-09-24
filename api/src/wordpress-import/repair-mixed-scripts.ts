/**
 * Scan + fix Latin look-alikes embedded in otherwise-Cyrillic article titles/slugs.
 *
 *   npx ts-node --transpile-only src/wordpress-import/repair-mixed-scripts.ts
 *   npx ts-node --transpile-only src/wordpress-import/repair-mixed-scripts.ts --dry-run
 */
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { fixMixedScriptLookalikes } from '../common/cyrillic-latin-fold';

loadEnv({ path: resolve(__dirname, '../../../.env') });
loadEnv({ path: resolve(__dirname, '../../.env') });

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const connectionString =
    process.env.DATABASE_URL ||
    new ConfigService().get<string>('DATABASE_URL');
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const articles = await prisma.article.findMany({
    select: {
      id: true,
      path: true,
      titleBg: true,
      titleEn: true,
      seoTitleBg: true,
      seoTitleEn: true,
      slug: true,
    },
  });

  let fixed = 0;
  for (const article of articles) {
    const patch: Record<string, string> = {};
    const titleBg = fixMixedScriptLookalikes(article.titleBg);
    if (titleBg) patch.titleBg = titleBg;
    const titleEn = article.titleEn
      ? fixMixedScriptLookalikes(article.titleEn)
      : null;
    if (titleEn) patch.titleEn = titleEn;
    const seoTitleBg = article.seoTitleBg
      ? fixMixedScriptLookalikes(article.seoTitleBg)
      : null;
    if (seoTitleBg) patch.seoTitleBg = seoTitleBg;
    const seoTitleEn = article.seoTitleEn
      ? fixMixedScriptLookalikes(article.seoTitleEn)
      : null;
    if (seoTitleEn) patch.seoTitleEn = seoTitleEn;
    const slug = fixMixedScriptLookalikes(article.slug);
    if (slug) patch.slug = slug;

    if (Object.keys(patch).length === 0) continue;

    fixed += 1;
    console.log(
      `${dryRun ? '[dry-run] ' : ''}${article.path}: ${JSON.stringify(patch)}`,
    );
    if (!dryRun) {
      await prisma.article.update({
        where: { id: article.id },
        data: patch,
      });
    }
  }

  console.log(
    dryRun
      ? `Would fix ${fixed} article(s).`
      : `Fixed ${fixed} article(s).`,
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
