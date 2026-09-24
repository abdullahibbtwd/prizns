/**
 * Clean drafts that look like the F-05 finding: READY-but-implausible translation,
 * empty collage blocks, or the Dunav Ultra test draft.
 *
 *   npm run repair:publish-quality --prefix api
 *   npm run repair:publish-quality --prefix api -- --dry-run
 */
import { ConfigService } from '@nestjs/config';
import { PrismaClient, TranslationStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import {
  stripEmptyBodyBlocks,
  translationLooksReady,
  validateStoryForPublish,
} from '../common/translation-quality';

loadEnv({ path: resolve(__dirname, '../../../.env') });
loadEnv({ path: resolve(__dirname, '../../.env') });

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const connectionString =
    process.env.DATABASE_URL ||
    new ConfigService().get<string>('DATABASE_URL');
  if (!connectionString) throw new Error('DATABASE_URL is required');

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const articles = await prisma.article.findMany({
    select: {
      id: true,
      path: true,
      titleBg: true,
      titleEn: true,
      subtitleBg: true,
      subtitleEn: true,
      status: true,
      translationStatus: true,
      body: true,
    },
  });

  let touched = 0;
  for (const article of articles) {
    const body = Array.isArray(article.body) ? (article.body as never[]) : [];
    const cleanedBody = stripEmptyBodyBlocks(body);
    const issues = validateStoryForPublish({
      titleBg: article.titleBg,
      titleEn: article.titleEn,
      subtitleBg: article.subtitleBg,
      subtitleEn: article.subtitleEn,
      translationStatus: article.translationStatus,
      body: cleanedBody,
    });
    const isDunavDraft =
      /одисея\s*2026|dunav\s*ultra/i.test(article.titleBg) &&
      (article.status === 'DRAFT' ||
        issues.some((i) => i.code === 'gibberish' || i.code === 'empty_collage'));

    const needsTranslationReset =
      article.translationStatus === TranslationStatus.READY &&
      (!translationLooksReady(article.titleBg, article.titleEn) ||
        (article.subtitleBg?.trim() &&
          !translationLooksReady(article.subtitleBg, article.subtitleEn)));

    const bodyChanged =
      JSON.stringify(cleanedBody) !== JSON.stringify(body);

    if (!isDunavDraft && !needsTranslationReset && !bodyChanged && issues.length === 0) {
      continue;
    }

    touched += 1;
    console.log(
      `${dryRun ? '[dry-run] ' : ''}${article.path} (${article.status}/${article.translationStatus})`,
      issues.map((i) => i.code).join(',') || 'cleanup',
    );

    if (dryRun) continue;

    await prisma.article.update({
      where: { id: article.id },
      data: {
        body: cleanedBody as never,
        ...(needsTranslationReset
          ? {
              translationStatus: TranslationStatus.PENDING,
              translationError:
                'Reset: English looked unfinished while status was READY',
            }
          : {}),
        ...(isDunavDraft && article.status === 'DRAFT'
          ? {
              // Keep as draft but clear gibberish markers by resetting EN copies
              titleEn: translationLooksReady(article.titleBg, article.titleEn)
                ? article.titleEn
                : null,
            }
          : {}),
      },
    });
  }

  console.log(
    dryRun ? `Would clean ${touched} article(s).` : `Cleaned ${touched} article(s).`,
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
