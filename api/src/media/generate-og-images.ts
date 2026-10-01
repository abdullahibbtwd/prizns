/**
 * Manual backfill: generate missing Open Graph JPEG derivatives for CMS WebP media.
 *
 * Does NOT run on build, deploy, or boot. Run explicitly:
 *
 *   npm run generate:og-images --prefix api -- --dry-run
 *   npm run generate:og-images --prefix api
 *
 * On the VPS (API container, after image has this script):
 *   docker compose exec api npm run generate:og-images -- --dry-run
 *   docker compose exec api npm run generate:og-images
 *
 * Safety:
 * - dry-run mode (no writes)
 * - skip when `{id}-og.jpg` already exists (default)
 * - never deletes or renames existing WebP / thumbs
 * - never mutates MediaAsset / Article rows
 * - continues after per-object failures
 * - cursor-batched (does not load all rows into memory)
 *
 * Flags:
 *   --dry-run              Preview only
 *   --limit=N              Cap how many candidates to consider
 *   --batch-size=N         DB page size (default 50)
 *   --overwrite            Replace existing -og.jpg (off by default)
 *   --all-images           All DONE WebP media (default: article hero images only)
 */

import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import * as Minio from 'minio';
import { MediaKind, MediaProcessStatus, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { processOgJpeg } from './image-process';
import { ogObjectKeyFromWebpKey } from '../common/share-image.util';

loadEnv({ path: resolve(__dirname, '../../../.env') });
loadEnv({ path: resolve(__dirname, '../../.env') });

export type OgBackfillCounters = {
  found: number;
  generated: number;
  skipped: number;
  failed: number;
  wouldGenerate: number;
};

type MediaRow = {
  id: string;
  key: string;
  url: string;
};

function parseFlagInt(argv: string[], name: string, fallback: number): number {
  const arg = argv.find((value) => value.startsWith(`${name}=`));
  if (!arg) return fallback;
  const n = Number(arg.slice(name.length + 1));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function createMinio() {
  const endPoint = process.env.MINIO_ENDPOINT;
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;
  const bucket = process.env.MINIO_BUCKET;
  if (!endPoint || !accessKey || !secretKey || !bucket) {
    throw new Error(
      'MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, and MINIO_BUCKET are required',
    );
  }
  const port = Number(process.env.MINIO_PORT || 9000);
  const useSSL = process.env.MINIO_USE_SSL === 'true';
  return {
    bucket,
    client: new Minio.Client({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    }),
  };
}

async function objectExists(
  client: Minio.Client,
  bucket: string,
  key: string,
): Promise<boolean> {
  try {
    await client.statObject(bucket, key);
    return true;
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    const statusCode = (error as { statusCode?: number })?.statusCode;
    if (code === 'NotFound' || code === 'NoSuchKey' || statusCode === 404) {
      return false;
    }
    throw error;
  }
}

async function getObjectBuffer(
  client: Minio.Client,
  bucket: string,
  key: string,
): Promise<Buffer> {
  const stream = await client.getObject(bucket, key);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function isEligibleWebpKey(key: string): boolean {
  return Boolean(ogObjectKeyFromWebpKey(key));
}

export function formatSummary(
  counters: OgBackfillCounters,
  dryRun: boolean,
): string {
  const lines = [
    dryRun ? 'Dry run summary:' : 'Migration summary:',
    `Found:          ${counters.found}`,
    dryRun
      ? `Would generate: ${counters.wouldGenerate}`
      : `Generated:      ${counters.generated}`,
    `Skipped:        ${counters.skipped}`,
    `Failed:         ${counters.failed}`,
  ];
  return lines.join('\n');
}

async function* iterateAllDoneWebp(
  prisma: PrismaClient,
  batchSize: number,
): AsyncGenerator<MediaRow> {
  let cursor: string | undefined;
  for (;;) {
    const rows = await prisma.mediaAsset.findMany({
      where: {
        kind: MediaKind.IMAGE,
        status: MediaProcessStatus.DONE,
        key: { endsWith: '.webp' },
        NOT: { key: { endsWith: '-thumb.webp' } },
      },
      select: { id: true, key: true, url: true },
      orderBy: { id: 'asc' },
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (rows.length === 0) return;
    for (const row of rows) {
      if (isEligibleWebpKey(row.key)) yield row;
    }
    cursor = rows[rows.length - 1]?.id;
    if (rows.length < batchSize) return;
  }
}

async function* iterateArticleHeroWebp(
  prisma: PrismaClient,
  batchSize: number,
): AsyncGenerator<MediaRow> {
  const seenMedia = new Set<string>();
  let cursor: string | undefined;
  for (;;) {
    const articles = await prisma.article.findMany({
      where: { heroMediaId: { not: null } },
      select: { id: true, heroMediaId: true },
      orderBy: { id: 'asc' },
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (articles.length === 0) return;

    const mediaIds = [
      ...new Set(
        articles
          .map((row) => row.heroMediaId)
          .filter((id): id is string => Boolean(id))
          .filter((id) => !seenMedia.has(id)),
      ),
    ];
    for (const id of mediaIds) seenMedia.add(id);

    if (mediaIds.length > 0) {
      const rows = await prisma.mediaAsset.findMany({
        where: {
          id: { in: mediaIds },
          kind: MediaKind.IMAGE,
          status: MediaProcessStatus.DONE,
          key: { endsWith: '.webp' },
          NOT: { key: { endsWith: '-thumb.webp' } },
        },
        select: { id: true, key: true, url: true },
      });
      for (const row of rows) {
        if (isEligibleWebpKey(row.key)) yield row;
      }
    }

    cursor = articles[articles.length - 1]?.id;
    if (articles.length < batchSize) return;
  }
}

export async function runOgImageBackfill(
  argv: string[],
): Promise<OgBackfillCounters> {
  const dryRun = argv.includes('--dry-run');
  const overwrite = argv.includes('--overwrite');
  const allImages = argv.includes('--all-images');
  const limit = parseFlagInt(argv, '--limit', Number.POSITIVE_INFINITY);
  const batchSize = parseFlagInt(argv, '--batch-size', 50);

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  const minio = createMinio();

  const counters: OgBackfillCounters = {
    found: 0,
    generated: 0,
    skipped: 0,
    failed: 0,
    wouldGenerate: 0,
  };

  try {
    console.log(
      [
        dryRun ? '[dry-run]' : '[apply]',
        allImages ? 'scope=all-done-webp' : 'scope=article-heroes',
        overwrite ? 'overwrite=on' : 'overwrite=off',
        `batchSize=${batchSize}`,
        Number.isFinite(limit) ? `limit=${limit}` : 'limit=none',
      ].join(' '),
    );

    const source = allImages
      ? iterateAllDoneWebp(prisma, batchSize)
      : iterateArticleHeroWebp(prisma, batchSize);

    for await (const row of source) {
      if (counters.found >= limit) break;
      counters.found += 1;

      const ogKey = ogObjectKeyFromWebpKey(row.key);
      if (!ogKey) {
        counters.skipped += 1;
        console.log(
          `skip  media=${row.id} reason=ineligible-key key=${row.key}`,
        );
        continue;
      }

      let exists = false;
      try {
        exists = await objectExists(minio.client, minio.bucket, ogKey);
      } catch (error) {
        counters.failed += 1;
        console.error(
          `fail  media=${row.id} key=${row.key} stage=stat-og error=${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        continue;
      }

      if (exists && !overwrite) {
        counters.skipped += 1;
        console.log(`skip  media=${row.id} reason=og-exists ogKey=${ogKey}`);
        continue;
      }

      if (dryRun) {
        counters.wouldGenerate += 1;
        console.log(
          `would media=${row.id} source=${row.key} → ${ogKey}${
            exists ? ' (overwrite)' : ''
          }`,
        );
        continue;
      }

      try {
        const sourceExists = await objectExists(
          minio.client,
          minio.bucket,
          row.key,
        );
        if (!sourceExists) {
          counters.failed += 1;
          console.error(
            `fail  media=${row.id} key=${row.key} stage=source-missing`,
          );
          continue;
        }

        const sourceBuf = await getObjectBuffer(
          minio.client,
          minio.bucket,
          row.key,
        );
        const jpeg = await processOgJpeg(sourceBuf);
        await minio.client.putObject(minio.bucket, ogKey, jpeg, jpeg.length, {
          'Content-Type': 'image/jpeg',
        });
        counters.generated += 1;
        console.log(
          `ok    media=${row.id} ogKey=${ogKey} bytes=${jpeg.length}`,
        );
      } catch (error) {
        counters.failed += 1;
        console.error(
          `fail  media=${row.id} key=${row.key} stage=generate error=${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    console.log(formatSummary(counters, dryRun));
    return counters;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await runOgImageBackfill(process.argv.slice(2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
