/**
 * Build an Nginx map of WordPress-era `/{slug}` URLs → journal `/{section}/{slug}`.
 *
 * After git pull on the VPS, rebuild the API image so `dist/` contains this file:
 *   docker compose up -d --build api
 *
 * Generate (retries DB pages, backs up the previous map, refuses a sudden shrink):
 *   docker compose exec api node dist/wordpress-import/generate-nginx-redirects.js --dry-run
 *   docker compose exec api node dist/wordpress-import/generate-nginx-redirects.js --min-redirects=1800
 *
 * Apply on the Slackware host with backup + nginx -t rollback:
 *   sh deploy/nginx/apply-legacy-redirects.sh
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type ArticleStatus } from '@prisma/client';
import {
  writeMapAtomically,
  withRetry,
} from './nginx-legacy-redirects-io';
import {
  buildLegacyRedirectMap,
  recommendedMapHashMaxSize,
  renderNginxRedirectMap,
  type LegacyRedirectArticle,
} from './nginx-legacy-redirects';

config({ path: resolve(__dirname, '../../../.env') });
config({ path: resolve(process.cwd(), '../.env') });
config({ path: resolve(process.cwd(), '.env') });

const DEFAULT_OUT = '/tmp/redirects.map';
const DEFAULT_STATUSES: ArticleStatus[] = ['PUBLISHED', 'ARCHIVED'];
const DEFAULT_PAGE_SIZE = 500;
const DEFAULT_RETRIES = 5;
const DEFAULT_DELAY_MS = 1000;
const DEFAULT_KEEP_BACKUPS = 5;

type Flags = {
  out?: string;
  stdout?: boolean;
  'dry-run'?: boolean;
  all?: boolean;
  force?: boolean;
  'no-trailing-slash'?: boolean;
  retries?: string;
  'page-size'?: string;
  'min-redirects'?: string;
  'delay-ms'?: string;
  'keep-backups'?: string;
};

function parseFlags(argv: string[]): Flags {
  const flags: Record<string, string | boolean> = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq === -1) {
      flags[arg.slice(2)] = true;
    } else {
      flags[arg.slice(2, eq)] = arg.slice(eq + 1);
    }
  }
  return flags as Flags;
}

function intFlag(value: string | undefined, fallback: number, min = 0): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min) {
    throw new Error(`invalid integer flag: ${value}`);
  }
  return parsed;
}

function skipSummary(
  skipped: ReturnType<typeof buildLegacyRedirectMap>['skipped'],
) {
  const counts = new Map<string, number>();
  for (const row of skipped) {
    counts.set(row.reason, (counts.get(row.reason) ?? 0) + 1);
  }
  if (counts.size === 0) return 'none skipped';
  return [...counts.entries()]
    .map(([reason, count]) => `${count} ${reason}`)
    .join(', ');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function loadArticles(
  prisma: PrismaClient,
  statuses: ArticleStatus[] | undefined,
  opts: { pageSize: number; retries: number; delayMs: number },
): Promise<LegacyRedirectArticle[]> {
  const articles: LegacyRedirectArticle[] = [];
  let cursor: { id: string } | undefined;
  let page = 0;

  for (;;) {
    page += 1;
    const rows = await withRetry(
      () =>
        prisma.article.findMany({
          where: statuses ? { status: { in: statuses } } : undefined,
          select: { id: true, slug: true, path: true, section: true },
          orderBy: [{ slug: 'asc' }, { id: 'asc' }],
          take: opts.pageSize,
          ...(cursor ? { skip: 1, cursor } : {}),
        }),
      {
        retries: opts.retries,
        delayMs: opts.delayMs,
        label: `articles page ${page}`,
        onRetry: (attempt, waitMs, error) => {
          console.error(
            `retry ${attempt}/${opts.retries} articles page ${page}: ${errorMessage(error)} (wait ${waitMs}ms)`,
          );
        },
      },
    );

    articles.push(
      ...rows.map((row) => ({
        slug: row.slug,
        path: row.path,
        section: row.section,
      })),
    );
    console.error(`loaded ${articles.length} articles (page ${page})`);

    if (rows.length < opts.pageSize) break;
    const last = rows[rows.length - 1];
    if (!last) break;
    cursor = { id: last.id };
  }

  return articles;
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const dryRun = Boolean(flags['dry-run']);
  const toStdout = Boolean(flags.stdout);
  const force = Boolean(flags.force);
  const out =
    typeof flags.out === 'string' && flags.out ? flags.out : DEFAULT_OUT;
  const statuses: ArticleStatus[] | undefined = flags.all
    ? undefined
    : DEFAULT_STATUSES;
  const pageSize = intFlag(flags['page-size'], DEFAULT_PAGE_SIZE, 1);
  const retries = intFlag(flags.retries, DEFAULT_RETRIES, 1);
  const delayMs = intFlag(flags['delay-ms'], DEFAULT_DELAY_MS, 0);
  const minRedirects = intFlag(flags['min-redirects'], 1, 0);
  const keepBackups = intFlag(flags['keep-backups'], DEFAULT_KEEP_BACKUPS, 0);

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const articles = await loadArticles(prisma, statuses, {
      pageSize,
      retries,
      delayMs,
    });

    const map = buildLegacyRedirectMap(articles, {
      trailingSlash: !flags['no-trailing-slash'],
    });
    const body = renderNginxRedirectMap(map, { articles: articles.length });
    const uniqueSlugs = map.redirects.filter((row) => !row.from.endsWith('/'))
      .length;
    const hashSize = recommendedMapHashMaxSize(map.lines.length);

    console.error(
      `${dryRun ? '[dry-run] ' : ''}mapped ${uniqueSlugs} legacy slug${uniqueSlugs === 1 ? '' : 's'} ` +
        `(${map.lines.length} nginx lines, ${articles.length} articles, ${skipSummary(map.skipped)})`,
    );
    console.error(
      `nginx map_hash_max_size should be at least ${hashSize} (stage2.conf already uses 16384)`,
    );

    for (const row of map.skipped.filter((item) => item.reason === 'collision')) {
      console.error(`skip collision: /${row.slug} → ${row.destination}`);
    }
    for (const row of map.skipped.filter((item) => item.reason === 'reserved')) {
      console.error(`skip reserved slug: /${row.slug}`);
    }

    if (dryRun) {
      const preview = map.lines.slice(0, 5);
      if (preview.length) {
        console.log(preview.join('\n'));
      }
      return;
    }

    if (toStdout) {
      process.stdout.write(body);
      return;
    }

    const written = await writeMapAtomically(out, body, {
      minRedirects,
      force,
      keepBackups,
    });
    if (written.backupPath) {
      console.error(
        `backed up previous map (${written.previousLineCount} lines) to ${written.backupPath}`,
      );
    }
    console.error(`wrote ${out}`);
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  if (error instanceof Error && error.cause) {
    console.error(error.cause);
  }
  process.exit(1);
});
