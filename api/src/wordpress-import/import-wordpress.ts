/**
 * Import WordPress REST users + posts into the current journal (Prisma + MinIO).
 *
 * Local — fetch WP, write a migration package (no database):
 *   npm run import:wordpress:export --prefix api
 *
 * Coolify / VPS Docker — copy wordpress-export onto the API container, then:
 *   docker compose exec api node dist/wordpress-import/import-wordpress.js --package=/app/wordpress-export --users
 * Skip CMS category records:
 *   ... --package=/app/wordpress-export --users --skip-categories
 *
 * After import, flatten subcategories onto main categories:
 *   docker compose exec api node dist/wordpress-import/merge-wordpress-categories.js --dry-run
 *   docker compose exec api node dist/wordpress-import/merge-wordpress-categories.js
 *
 * Live WP (only when the API can reach the site):
 *   node dist/wordpress-import/import-wordpress.js --users
 *
 * Optional cap: pass --limit=20 to fetch a subset.
 */
import { createHash } from 'crypto';
import { setDefaultResultOrder } from 'dns';
import { config } from 'dotenv';
import { access, mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { dirname, join, relative, resolve, sep } from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type ArticleSection } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as Minio from 'minio';
import {
  CATEGORY_PARENT,
  HIDDEN_CMS_CATEGORY_SLUGS,
  resolveCategoryPlacement,
} from '../categories/canonical-categories';
import { mapWpPost, parseWpPostsJson } from './map';
import { attachLocationTags } from './location-tags';
import {
  articleToExportJson,
  buildWordpressPackage,
  isWordpressPackage,
  parseArticlesFile,
  parseAuthorsJson,
  parseCategoriesJson,
  type PackagedAuthor,
  type PackagedCategory,
} from './package';
import type { MappedWpArticle, WpInlineImage, WpPost, WpUser } from './types';
import {
  mapWpUser,
  parseWpUsersJson,
  wpUserAlias,
  type MappedWpUser,
} from './users';

config({ path: resolve(__dirname, '../../../.env') });
config({ path: resolve(process.cwd(), '../.env') });
config({ path: resolve(process.cwd(), '.env') });

// Docker/Alpine often gets an IPv6 AAAA that blackholes; undici then times out on :443.
setDefaultResultOrder('ipv4first');

const UA = 'PriznsWordpressImport/1.0';
const FETCH_ATTEMPTS = 8;
const PAGE_GAP_MS = 800;
const POSTS_PER_PAGE = 25;

type PostsCheckpoint = {
  origin: string;
  perPage: number;
  page: number;
  totalPages: number;
  posts: WpPost[];
};

type Flags = {
  from?: string;
  file?: string;
  slug?: string;
  id?: string;
  limit?: string;
  draft?: boolean;
  update?: boolean;
  users?: boolean;
  translate?: boolean;
  'dry-run'?: boolean;
  'skip-media'?: boolean;
  export?: string;
  package?: string;
  images?: string;
  'skip-categories'?: boolean;
};

type MediaDirs = {
  packageDir: string;
  imagesDir: string;
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

function wpOrigin(from: string): string {
  return from.replace(/\/$/, '').replace(/\/wp-json.*$/i, '');
}

function sleep(ms: number) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function errorCode(error: unknown): string {
  let current: unknown = error;
  for (let i = 0; i < 4 && current; i += 1) {
    if (current && typeof current === 'object' && 'code' in current) {
      const code = (current as { code?: string }).code;
      if (code) return String(code);
    }
    current =
      current instanceof Error && 'cause' in current
        ? current.cause
        : undefined;
  }
  return '';
}

function isRetryable(error: unknown, status?: number): boolean {
  if (status && [408, 429, 500, 502, 503, 504].includes(status)) return true;
  const code = errorCode(error);
  if (
    [
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'EPIPE',
      'EAI_AGAIN',
      'UND_ERR_SOCKET',
      'UND_ERR_CONNECT_TIMEOUT',
      'UND_ERR_HEADERS_TIMEOUT',
      'UND_ERR_BODY_TIMEOUT',
    ].includes(code)
  ) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /econnreset|etimedout|fetch failed|socket|network|aborted/i.test(
    message,
  );
}

async function fetchJson(
  url: string,
): Promise<{ body: unknown; headers: Headers }> {
  const username = process.env.WORDPRESS_USERNAME;
  const applicationPassword = process.env.WORDPRESS_APPLICATION_PASSWORD;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': UA,
  };

  if (username && applicationPassword) {
    const token = Buffer.from(
      `${username}:${applicationPassword}`,
      'utf8',
    ).toString('base64');

    headers.Authorization = `Basic ${token}`;
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(90_000),
      });
      if (!response.ok) {
        const err = new Error(
          `${response.status} ${response.statusText} for ${url}`,
        );
        if (attempt < FETCH_ATTEMPTS && isRetryable(err, response.status)) {
          const retryAfter = Number(response.headers.get('Retry-After'));
          const waitMs =
            Number.isFinite(retryAfter) && retryAfter > 0
              ? retryAfter * 1000
              : Math.min(30_000, 1000 * 2 ** (attempt - 1));
          console.warn(
            `WordPress ${response.status} on attempt ${attempt}/${FETCH_ATTEMPTS}; retrying in ${Math.round(waitMs / 1000)}s`,
          );
          await sleep(waitMs);
          continue;
        }
        throw err;
      }
      return {
        body: await response.json(),
        headers: response.headers,
      };
    } catch (error) {
      lastError = error;
      const httpStatus =
        error instanceof Error ? Number(/^(\d{3})\s/.exec(error.message)?.[1]) : 0;
      if (httpStatus && !isRetryable(error, httpStatus)) {
        throw error;
      }
      if (attempt >= FETCH_ATTEMPTS || !isRetryable(error, httpStatus || undefined)) {
        throw new Error(formatNetworkError(url, error));
      }
      const waitMs = Math.min(30_000, 1000 * 2 ** (attempt - 1));
      console.warn(
        `WordPress connection dropped (${errorCode(error) || 'network'}) on attempt ${attempt}/${FETCH_ATTEMPTS}; retrying in ${Math.round(waitMs / 1000)}s`,
      );
      await sleep(waitMs);
    }
  }

  throw new Error(formatNetworkError(url, lastError));
}

async function loadUsers(origin: string): Promise<WpUser[]> {
  const users: WpUser[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const url = new URL(`${origin}/wp-json/wp/v2/users`);
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    url.searchParams.set('context', 'edit');
    const { body, headers } = await fetchJson(url.toString());
    const batch = parseWpUsersJson(body);
    users.push(...batch);
    totalPages = Number(headers.get('X-WP-TotalPages') || page);
    if (batch.length === 0) break;
    page += 1;
  }
  return users;
}

async function readPostsCheckpoint(
  path: string,
  origin: string,
  perPage: number,
): Promise<PostsCheckpoint | null> {
  try {
    const raw = JSON.parse(await readFile(path, 'utf8')) as PostsCheckpoint;
    if (
      raw.origin !== origin ||
      raw.perPage !== perPage ||
      !Array.isArray(raw.posts) ||
      !raw.page
    ) {
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

async function writePostsCheckpoint(path: string, data: PostsCheckpoint) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data));
}

async function loadPosts(
  flags: Flags,
  options?: { checkpointPath?: string },
): Promise<WpPost[]> {
  if (flags.file) {
    const raw = JSON.parse(await readFile(resolve(flags.file), 'utf8')) as unknown;
    let posts = parseWpPostsJson(raw);
    if (flags.slug) posts = posts.filter((post) => post.slug === flags.slug);
    if (flags.id) posts = posts.filter((post) => String(post.id) === flags.id);
    return posts;
  }

  const origin = wpOrigin(
    flags.from || process.env.WORDPRESS_URL || 'https://prizni.bg',
  );
  if (flags.id) {
    const { body } = await fetchJson(
      `${origin}/wp-json/wp/v2/posts/${flags.id}?_embed=1`,
    );
    return parseWpPostsJson(body);
  }

  const perPage = POSTS_PER_PAGE;
  const limit = flags.limit ? Number(flags.limit) : Number.POSITIVE_INFINITY;
  const checkpointPath = options?.checkpointPath;
  const saved = checkpointPath
    ? await readPostsCheckpoint(checkpointPath, origin, perPage)
    : null;

  const posts: WpPost[] = saved?.posts ? [...saved.posts] : [];
  let page = saved ? saved.page + 1 : 1;
  let totalPages = saved?.totalPages || 1;

  if (saved) {
    console.log(
      `Resuming WordPress export from page ${page} (${posts.length} posts already fetched).`,
    );
  }

  while (page <= totalPages && posts.length < limit) {
    const url = new URL(`${origin}/wp-json/wp/v2/posts`);
    url.searchParams.set('_embed', '1');
    url.searchParams.set('per_page', String(perPage));
    url.searchParams.set('page', String(page));
    url.searchParams.set('status', 'publish');
    if (flags.slug) url.searchParams.set('slug', flags.slug);
    const { body, headers } = await fetchJson(url.toString());
    const batch = parseWpPostsJson(body);
    posts.push(...batch);
    totalPages = Number(headers.get('X-WP-TotalPages') || page);
    const total = headers.get('X-WP-Total');
    console.log(
      `Fetched posts page ${page}/${totalPages}` +
        (total ? ` (${posts.length}/${total})` : ` (${posts.length})`),
    );
    if (checkpointPath) {
      await writePostsCheckpoint(checkpointPath, {
        origin,
        perPage,
        page,
        totalPages,
        posts,
      });
    }
    if (batch.length === 0 || flags.slug) break;
    page += 1;
    if (page <= totalPages && posts.length < limit) {
      await sleep(PAGE_GAP_MS);
    }
  }

  return posts.slice(0, Number.isFinite(limit) ? limit : posts.length);
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function resolvePackagedImage(
  file: string,
  dirs: MediaDirs,
): Promise<string> {
  const name = file.replace(/^images[/\\]/, '');
  const roots = [dirs.packageDir, dirs.imagesDir, join(dirs.packageDir, 'wordpress-export')];
  const candidates = roots.flatMap((root) => [
    resolve(root, file),
    resolve(root, name),
    resolve(root, 'images', name),
  ]);
  const allowed = [dirs.packageDir, dirs.imagesDir, join(dirs.packageDir, 'wordpress-export')];
  for (const abs of candidates) {
    const inside = allowed.some((root) => {
      const rel = relative(root, abs);
      return rel !== '' && !rel.startsWith(`..${sep}`) && rel !== '..' && !rel.startsWith(sep);
    });
    if (!inside) continue;
    if (await pathExists(abs)) return abs;
  }
  throw new Error(`Packaged image not found: ${file}`);
}

function uniqueImageName(src: string, used: Set<string>): string {
  const base =
    src.split('/').pop()?.split('?')[0]?.replace(/[^a-zA-Z0-9._-]/g, '') ||
    'image.jpg';
  const hash = createHash('sha1').update(src).digest('hex').slice(0, 8);
  let name = `${hash}-${base}`;
  let i = 2;
  while (used.has(name)) {
    name = `${hash}-${i}-${base}`;
    i += 1;
  }
  return name;
}

function mediaKey(image: WpInlineImage, hintId?: number): string {
  const file =
    image.src.split('/').pop()?.split('?')[0]?.replace(/[^a-zA-Z0-9._-]/g, '') ||
    image.file?.split(/[/\\]/).pop()?.replace(/[^a-zA-Z0-9._-]/g, '') ||
    'image.jpg';
  if (hintId) return `wp/${hintId}/${file}`;
  const hash = createHash('sha1')
    .update(image.src || image.file || file)
    .digest('hex')
    .slice(0, 12);
  return `wp/url-${hash}/${file}`;
}

function mimeFromName(name: string, fallback = 'image/jpeg'): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return fallback;
}

function createMinio() {
  const endPoint = process.env.MINIO_ENDPOINT;
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;
  const bucket = process.env.MINIO_BUCKET;
  if (!endPoint || !accessKey || !secretKey || !bucket) return null;
  const port = Number(process.env.MINIO_PORT || 9000);
  const useSSL = process.env.MINIO_USE_SSL === 'true';
  const publicUrl = (
    process.env.MINIO_PUBLIC_URL ??
    `${useSSL ? 'https' : 'http'}://${endPoint}:${port}`
  ).replace(/\/$/, '');
  return {
    bucket,
    publicUrl,
    client: new Minio.Client({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    }),
  };
}

async function importImage(
  prisma: PrismaClient,
  image: WpInlineImage,
  opts: { skipMedia: boolean; hintId?: number; mediaDirs?: MediaDirs },
): Promise<{ id: string; url: string } | null> {
  const key = mediaKey(image, opts.hintId);
  const existing = await prisma.mediaAsset.findUnique({ where: { key } });
  if (existing) return { id: existing.id, url: existing.url };

  const originalName = key.split('/').pop() ?? 'image.jpg';
  let url = image.src || '';
  let size: number | null = null;
  let mimeType = mimeFromName(originalName);

  if (!opts.skipMedia) {
    const minio = createMinio();
    try {
      let buffer: Buffer;
      if (image.file && opts.mediaDirs) {
        buffer = await readFile(await resolvePackagedImage(image.file, opts.mediaDirs));
        mimeType = mimeFromName(originalName, mimeType);
      } else {
        const response = await fetch(image.src, { headers: { 'User-Agent': UA } });
        if (!response.ok) throw new Error(`download ${response.status}`);
        buffer = Buffer.from(await response.arrayBuffer());
        mimeType = response.headers.get('content-type')?.split(';')[0] || mimeType;
      }
      size = buffer.length;
      if (minio) {
        await minio.client.putObject(minio.bucket, key, buffer, size, {
          'Content-Type': mimeType,
        });
        url = `${minio.publicUrl}/${minio.bucket}/${key}`;
        await prisma.fileObject.upsert({
          where: { key },
          update: { url, mimeType, size, originalName },
          create: {
            key,
            bucket: minio.bucket,
            originalName,
            mimeType,
            size,
            url,
          },
        });
      }
    } catch (error) {
      console.warn(
        `  media skipped (${image.file || image.src}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  const created = await prisma.mediaAsset.create({
    data: {
      key,
      url,
      mimeType,
      kind: 'IMAGE',
      originalName,
      size,
      titleBg: originalName,
      creditBg: image.caption || null,
    },
  });
  return { id: created.id, url: created.url };
}

async function upsertAuthor(
  prisma: PrismaClient,
  mapped: MappedWpArticle,
  opts: {
    skipTranslate: boolean;
    authorsByWpId: Map<number, string>;
  },
) {
  if (mapped.wpAuthorId && opts.authorsByWpId.has(mapped.wpAuthorId)) {
    return { id: opts.authorsByWpId.get(mapped.wpAuthorId)! };
  }

  const alias = mapped.wpAuthorId ? wpUserAlias(mapped.wpAuthorId) : null;
  const existing =
    (alias
      ? await prisma.author.findFirst({
          where: { aliases: { has: alias } },
        })
      : null) ||
    (await prisma.author.findUnique({ where: { slug: mapped.authorSlug } })) ||
    (await prisma.author.findFirst({
      where: {
        OR: [
          { nameBg: mapped.authorNameBg },
          { aliases: { has: mapped.authorNameBg } },
        ],
      },
    }));

  const translationStatus = opts.skipTranslate ? 'READY' : 'PENDING';

  if (existing) {
    const aliases = new Set(existing.aliases);
    if (alias) aliases.add(alias);
    return prisma.author.update({
      where: { id: existing.id },
      data: {
        bioBg: existing.bioBg || mapped.authorBioBg,
        aliases: [...aliases],
        translationStatus,
      },
    });
  }

  return prisma.author.create({
    data: {
      slug: mapped.authorSlug,
      nameBg: mapped.authorNameBg,
      roleBg: 'Автор',
      bioBg: mapped.authorBioBg,
      aliases: alias ? [alias] : [],
      isActive: true,
      sourceLang: 'bg',
      translationStatus,
    },
  });
}

async function importWpUser(
  prisma: PrismaClient,
  mapped: MappedWpUser,
  opts: {
    passwordHash: string;
    skipTranslate: boolean;
    adminEmail: string;
    mediaDirs?: MediaDirs;
  },
): Promise<{ authorId: string; action: 'created' | 'linked' | 'skipped' }> {
  const alias = wpUserAlias(mapped.wpId);
  const existingUser = await prisma.user.findUnique({
    where: { email: mapped.email },
    include: { author: true },
  });

  let user = existingUser;
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: mapped.email,
        name: mapped.name,
        passwordHash: opts.passwordHash,
        role: mapped.role,
        roles: mapped.roles,
        imageUrl: mapped.imageUrl,
        bio: mapped.bioBg,
        isActive: true,
        emailVerifiedAt: new Date(),
      },
      include: { author: true },
    });
  }

  const isSeedAdmin = user.email === opts.adminEmail;
  if (!isSeedAdmin && existingUser && !existingUser.author) {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: mapped.role, roles: mapped.roles },
    });
  }

  const existingAuthor =
    user.author ||
    (await prisma.author.findFirst({ where: { aliases: { has: alias } } })) ||
    (await prisma.author.findUnique({ where: { slug: mapped.slug } }));

  const translationStatus = opts.skipTranslate ? 'READY' : 'PENDING';
  const aliases = new Set(existingAuthor?.aliases ?? []);
  aliases.add(alias);

  const author = existingAuthor
    ? await prisma.author.update({
        where: { id: existingAuthor.id },
        data: {
          userId: existingAuthor.userId ?? user.id,
          bioBg: existingAuthor.bioBg || mapped.bioBg,
          imageUrl: existingAuthor.imageUrl || mapped.imageUrl,
          aliases: [...aliases],
          translationStatus,
        },
      })
    : await prisma.author.create({
        data: {
          slug: mapped.slug,
          nameBg: mapped.name,
          roleBg: 'Автор',
          bioBg: mapped.bioBg,
          imageUrl: mapped.imageUrl,
          aliases: [...aliases],
          isActive: true,
          showOnAuthors:
            mapped.roles.includes('AUTHOR') ||
            mapped.roles.includes('CONTRIBUTOR'),
          userId: user.id,
          sourceLang: 'bg',
          translationStatus,
        },
      });

  const action = existingUser ? 'linked' : 'created';

  if (mapped.imageFile && opts.mediaDirs) {
    const imported = await importImage(
      prisma,
      {
        src: mapped.imageUrl || mapped.imageFile,
        caption: '',
        alt: mapped.name,
        file: mapped.imageFile,
      },
      { skipMedia: false, mediaDirs: opts.mediaDirs, hintId: mapped.wpId },
    );
    if (imported) {
      await prisma.author.update({
        where: { id: author.id },
        data: { imageUrl: imported.url },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { imageUrl: imported.url },
      });
    }
  }

  return { authorId: author.id, action };
}

async function syncCategories(
  prisma: PrismaClient,
  articleId: string,
  slugs: string[],
  section?: ArticleSection,
) {
  const placement = resolveCategoryPlacement(slugs, section);
  const categories = await prisma.category.findMany({
    where: { slug: { in: placement.categorySlugs } },
    select: { id: true },
  });
  await prisma.articleCategory.deleteMany({ where: { articleId } });
  if (categories.length > 0) {
    await prisma.articleCategory.createMany({
      data: categories.map((category) => ({
        articleId,
        categoryId: category.id,
      })),
      skipDuplicates: true,
    });
  }
  await attachLocationTags(prisma, articleId, placement.locationSlugs);
}

async function syncTags(
  prisma: PrismaClient,
  articleId: string,
  tags: MappedWpArticle['tagNames'],
) {
  const ids: string[] = [];
  for (const tag of tags) {
    const row = await prisma.tag.upsert({
      where: { kind_slug: { kind: 'TOPIC', slug: tag.slug } },
      update: { nameBg: tag.nameBg },
      create: { kind: 'TOPIC', slug: tag.slug, nameBg: tag.nameBg },
    });
    ids.push(row.id);
  }
  await prisma.articleTag.deleteMany({ where: { articleId } });
  if (ids.length === 0) return;
  await prisma.articleTag.createMany({
    data: ids.map((tagId) => ({ articleId, tagId })),
    skipDuplicates: true,
  });
}

async function saveArticle(
  prisma: PrismaClient,
  mapped: MappedWpArticle,
  opts: {
    update: boolean;
    draft: boolean;
    skipMedia: boolean;
    skipTranslate: boolean;
    skipCategories?: boolean;
    authorsByWpId: Map<number, string>;
    mediaDirs?: MediaDirs;
  },
) {
  const status = opts.draft ? 'DRAFT' : mapped.status;
  const author = await upsertAuthor(prisma, mapped, opts);
  const heroMediaId = mapped.heroImage
    ? (await importImage(prisma, mapped.heroImage, {
        skipMedia: opts.skipMedia,
        mediaDirs: opts.mediaDirs,
      }))?.id ?? null
    : null;
  const galleryIds: string[] = [];
  const srcToMediaId = new Map<string, string>();
  if (heroMediaId && mapped.heroImage?.src) {
    srcToMediaId.set(mapped.heroImage.src, heroMediaId);
  }
  for (const image of mapped.galleryImages) {
    const imported = await importImage(prisma, image, {
      skipMedia: opts.skipMedia,
      mediaDirs: opts.mediaDirs,
    });
    if (imported) {
      galleryIds.push(imported.id);
      if (image.src) srcToMediaId.set(image.src, imported.id);
    }
  }

  const body = mapped.body.map((block) => {
    if (block.type !== 'image') return block;
    const mediaId = block.url ? srcToMediaId.get(block.url) : block.mediaId;
    return {
      type: 'image' as const,
      mediaId,
      url: mediaId ? undefined : block.url,
      captionBg: block.captionBg ?? '',
    };
  });

  const data = {
    section: mapped.section as ArticleSection,
    slug: mapped.slug,
    path: mapped.path,
    status,
    publishedAt: mapped.publishedAt,
    categoryBg: mapped.categoryBg,
    titleBg: mapped.titleBg,
    subtitleBg: mapped.subtitleBg,
    readTimeBg: mapped.readTimeBg,
    dateBg: mapped.dateBg,
    photoCreditBg: mapped.photoCreditBg,
    endLabelBg: 'Край',
    body,
    authorId: author.id,
    heroMediaId,
    seoTitleBg: mapped.seoTitleBg,
    seoDescriptionBg: mapped.seoDescriptionBg,
    sourceLang: 'bg',
    translationStatus: opts.skipTranslate ? ('READY' as const) : ('PENDING' as const),
  };

  const existing = await prisma.article.findUnique({
    where: { section_slug: { section: mapped.section, slug: mapped.slug } },
    select: { id: true },
  });

  if (existing && !opts.update) {
    return { id: existing.id, action: 'skipped' as const };
  }

  const row = existing
    ? await prisma.article.update({ where: { id: existing.id }, data })
    : await prisma.article.create({ data });

  await prisma.articleGalleryItem.deleteMany({ where: { articleId: row.id } });
  if (galleryIds.length > 0) {
    await prisma.articleGalleryItem.createMany({
      data: galleryIds.map((mediaId, sortOrder) => ({
        articleId: row.id,
        mediaId,
        sortOrder,
      })),
    });
  }

  if (!opts.skipCategories) {
    await syncCategories(
      prisma,
      row.id,
      mapped.categorySlugs,
      mapped.section,
    );
  }
  await syncTags(prisma, row.id, mapped.tagNames);

  return { id: row.id, action: existing ? ('updated' as const) : ('created' as const) };
}

async function upsertPackageCategories(
  prisma: PrismaClient,
  categories: PackagedCategory[],
) {
  for (const category of categories) {
    if (HIDDEN_CMS_CATEGORY_SLUGS.has(category.slug)) continue;
    if (CATEGORY_PARENT[category.slug]) continue;
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: {
        slug: category.slug,
        nameBg: category.nameBg,
        sourceLang: 'bg',
        translationStatus: 'READY',
      },
    });
  }
}

async function downloadToPackage(
  src: string,
  imagesDir: string,
  used: Set<string>,
): Promise<string | undefined> {
  try {
    const response = await fetch(src, { headers: { 'User-Agent': UA } });
    if (!response.ok) throw new Error(`download ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const name = uniqueImageName(src, used);
    used.add(name);
    await writeFile(join(imagesDir, name), buffer);
    return `images/${name}`;
  } catch (error) {
    console.warn(
      `  skip image ${src}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
  }
}

async function attachLocalImages(
  articles: MappedWpArticle[],
  authors: PackagedAuthor[],
  imagesDir: string,
) {
  const used = new Set<string>();
  const cache = new Map<string, string | undefined>();

  const download = async (src: string) => {
    if (!src) return undefined;
    if (cache.has(src)) return cache.get(src);
    const file = await downloadToPackage(src, imagesDir, used);
    cache.set(src, file);
    return file;
  };

  for (const article of articles) {
    if (article.heroImage) {
      const file = await download(article.heroImage.src);
      if (file) article.heroImage = { ...article.heroImage, file };
    }
    article.galleryImages = await Promise.all(
      article.galleryImages.map(async (image) => {
        const file = await download(image.src);
        return file ? { ...image, file } : image;
      }),
    );
  }

  for (const author of authors) {
    if (!author.imageUrl) continue;
    const file = await download(author.imageUrl);
    if (file) author.imageFile = file;
  }
}

function authorsFromArticles(articles: MappedWpArticle[]): PackagedAuthor[] {
  const byKey = new Map<string, PackagedAuthor>();
  for (const article of articles) {
    const key = article.wpAuthorId
      ? `id:${article.wpAuthorId}`
      : `slug:${article.authorSlug}`;
    if (byKey.has(key)) continue;
    byKey.set(key, {
      wpId: article.wpAuthorId ?? 0,
      email: `${article.authorSlug}@imported.prizni.local`,
      name: article.authorNameBg,
      slug: article.authorSlug,
      bioBg: article.authorBioBg,
      imageUrl: null,
      role: 'AUTHOR',
      roles: ['AUTHOR'],
    });
  }
  return [...byKey.values()];
}

async function writeExportPackage(
  exportDir: string,
  pkg: ReturnType<typeof buildWordpressPackage>,
) {
  await mkdir(join(exportDir, 'images'), { recursive: true });
  await writeFile(
    join(exportDir, 'articles.json'),
    JSON.stringify(
      {
        version: pkg.version,
        origin: pkg.origin,
        exportedAt: pkg.exportedAt,
        articles: pkg.articles.map(articleToExportJson),
      },
      null,
      2,
    ),
  );
  await writeFile(
    join(exportDir, 'authors.json'),
    JSON.stringify({ authors: pkg.authors }, null, 2),
  );
  await writeFile(
    join(exportDir, 'categories.json'),
    JSON.stringify({ categories: pkg.categories }, null, 2),
  );
}

async function loadExportPackage(flags: Flags): Promise<{
  packageDir: string;
  imagesDir: string;
  articles: MappedWpArticle[];
  authors: PackagedAuthor[];
  categories: PackagedCategory[];
}> {
  const packageDir = resolve(
    flags.package || (flags.file ? dirname(flags.file) : ''),
  );
  const articlesPath = flags.file
    ? resolve(flags.file)
    : join(packageDir, 'articles.json');
  const raw = JSON.parse(await readFile(articlesPath, 'utf8')) as unknown;
  if (!isWordpressPackage(raw)) {
    throw new Error(
      `${articlesPath} is not a mapped export package. Create one with --export=./wordpress-export`,
    );
  }
  const parsed = parseArticlesFile(raw);
  let authors: PackagedAuthor[] = [];
  const authorsPath = join(packageDir, 'authors.json');
  if (await pathExists(authorsPath)) {
    authors = parseAuthorsJson(
      JSON.parse(await readFile(authorsPath, 'utf8')) as unknown,
    );
  }
  let categories: PackagedCategory[] = [];
  const categoriesPath = join(packageDir, 'categories.json');
  if (!flags['skip-categories'] && (await pathExists(categoriesPath))) {
    categories = parseCategoriesJson(
      JSON.parse(await readFile(categoriesPath, 'utf8')) as unknown,
    );
  }
  const nestedImages = join(packageDir, 'wordpress-export', 'images');
  const imagesDir = resolve(
    flags.images ||
      ((await pathExists(join(packageDir, 'images')))
        ? join(packageDir, 'images')
        : (await pathExists(nestedImages))
          ? nestedImages
          : join(packageDir, 'images')),
  );
  return {
    packageDir,
    imagesDir,
    articles: parsed.articles,
    authors,
    categories,
  };
}

function formatNetworkError(url: string, error: unknown): string {
  const cause =
    error instanceof Error && error.cause instanceof Error ? error.cause : error;
  const code =
    cause && typeof cause === 'object' && 'code' in cause
      ? String((cause as { code?: string }).code)
      : undefined;
  const detail =
    cause instanceof Error
      ? [cause.message, code].filter(Boolean).join(' ')
      : String(cause);
  return [
    `Could not reach WordPress at ${url} (${detail}).`,
    'WORDPRESS_URL must be the live WordPress site (wp-json), not this Coolify app.',
    'From the API container: node -e "fetch(process.env.WORDPRESS_URL).then(r=>console.log(r.status)).catch(e=>console.error(e.cause||e))"',
  ].join(' ');
}

async function importMappedPackage(
  flags: Flags,
  skipTranslate: boolean,
) {
  const loaded = await loadExportPackage(flags);
  const importUsers = Boolean(flags.users) || loaded.authors.length > 0;
  const mediaDirs: MediaDirs = {
    packageDir: loaded.packageDir,
    imagesDir: loaded.imagesDir,
  };

  console.log(
    `Package ${loaded.packageDir}: ${loaded.authors.length} author(s), ${loaded.articles.length} article(s), images ${loaded.imagesDir}${flags['skip-categories'] ? ', skip-categories' : ''}`,
  );

  if (flags['dry-run']) {
    for (const author of loaded.authors) {
      console.log(`[dry-run] user #${author.wpId} ${author.email} ← ${author.name}`);
    }
    for (const article of loaded.articles) {
      console.log(
        `[dry-run] #${article.wpId} ${article.path} ← ${article.titleBg}`,
      );
    }
    return;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const sharedPassword =
    process.env.WORDPRESS_IMPORT_USER_PASSWORD?.trim() || '';
  if (importUsers && loaded.authors.some((author) => author.email) && sharedPassword.length < 8) {
    throw new Error(
      'Set WORDPRESS_IMPORT_USER_PASSWORD in .env (min 8 characters) before importing users.',
    );
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const authorsByWpId = new Map<number, string>();
  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@prizn.local')
    .toLowerCase()
    .trim();

  try {
    if (loaded.categories.length > 0) {
      await upsertPackageCategories(prisma, loaded.categories);
    }
    if (importUsers && loaded.authors.length > 0) {
      const passwordHash = await bcrypt.hash(sharedPassword, 12);
      console.log(
        `CMS login password for imported users: ${sharedPassword}\nThey can change it under Profile after signing in.`,
      );
      for (const author of loaded.authors) {
        if (!author.email) continue;
        const result = await importWpUser(prisma, author, {
          passwordHash,
          skipTranslate,
          adminEmail,
          mediaDirs,
        });
        if (author.wpId) authorsByWpId.set(author.wpId, result.authorId);
        console.log(
          `[${result.action}] user #${author.wpId} ${author.email} → author ${result.authorId}`,
        );
      }
    }

    for (const article of loaded.articles) {
      const result = await saveArticle(prisma, article, {
        update: Boolean(flags.update),
        draft: Boolean(flags.draft),
        skipMedia: Boolean(flags['skip-media']),
        skipTranslate,
        skipCategories: Boolean(flags['skip-categories']),
        authorsByWpId,
        mediaDirs,
      });
      console.log(
        `[${result.action}] #${article.wpId} ${article.path} (${result.id})`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function exportFromWordpress(flags: Flags, origin: string) {
  const exportDir = resolve(
    typeof flags.export === 'string' ? flags.export : '../wordpress-export',
  );
  const checkpointPath = join(exportDir, '.posts-checkpoint.json');
  console.log(`Exporting from ${origin} → ${exportDir}`);

  let wpUsers: WpUser[] = [];
  try {
    wpUsers = await loadUsers(origin);
    console.log(`Loaded ${wpUsers.length} WordPress user(s).`);
  } catch (error) {
    console.warn(
      `Users not exported (${error instanceof Error ? error.message : String(error)})`,
    );
  }

  const posts = await loadPosts(
    { ...flags, file: undefined },
    { checkpointPath },
  );
  console.log(`Loaded ${posts.length} WordPress post(s).`);
  const articles = posts.map(mapWpPost);
  const authors: PackagedAuthor[] =
    wpUsers.length > 0 ? wpUsers.map(mapWpUser) : authorsFromArticles(articles);

  const imagesDir = join(exportDir, 'images');
  await mkdir(imagesDir, { recursive: true });
  if (!flags['skip-media']) {
    await attachLocalImages(articles, authors, imagesDir);
  }

  const pkg = buildWordpressPackage({ origin, articles, authors });
  await writeExportPackage(exportDir, pkg);
  try {
    await unlink(checkpointPath);
  } catch {
    // no checkpoint to clear
  }
  console.log(
    `Wrote ${articles.length} article(s), ${authors.length} author(s), ${pkg.categories.length} categor${pkg.categories.length === 1 ? 'y' : 'ies'} to ${exportDir}`,
  );
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const skipTranslate = !flags.translate;

  if (flags.export) {
    const origin = wpOrigin(
      flags.from || process.env.WORDPRESS_URL || 'https://prizni.bg',
    );
    await exportFromWordpress(flags, origin);
    return;
  }

  if (flags.package) {
    await importMappedPackage(flags, skipTranslate);
    return;
  }

  if (flags.file) {
    const raw = JSON.parse(await readFile(resolve(flags.file), 'utf8')) as unknown;
    if (isWordpressPackage(raw)) {
      await importMappedPackage(flags, skipTranslate);
      return;
    }
  }

  const origin = wpOrigin(
    flags.from || process.env.WORDPRESS_URL || 'https://prizni.bg',
  );
  console.log(
    `WordPress origin: ${origin}${process.env.WORDPRESS_URL ? '' : ' (default; set WORDPRESS_URL in Coolify)'}`,
  );
  const importUsers = Boolean(flags.users);

  const wpUsers = importUsers ? await loadUsers(origin) : [];
  const posts = await loadPosts(flags);

  if (wpUsers.length === 0 && posts.length === 0) {
    console.log('No WordPress users or posts found.');
    return;
  }

  if (wpUsers.length > 0) {
    console.log(`Loaded ${wpUsers.length} WordPress user(s).`);
  }
  if (posts.length > 0) {
    console.log(`Loaded ${posts.length} WordPress post(s).`);
  }

  if (flags['dry-run']) {
    for (const user of wpUsers) {
      const mapped = mapWpUser(user);
      console.log(
        `[dry-run] user #${mapped.wpId} ${mapped.email} (${mapped.role}) ← ${mapped.name}`,
      );
    }
    for (const post of posts) {
      const mapped = mapWpPost(post);
      console.log(
        `[dry-run] #${mapped.wpId} ${mapped.section}/${mapped.slug} ← ${mapped.titleBg}`,
      );
      console.log(
        `          author=${mapped.authorNameBg} categories=${mapped.categorySlugs.join(',')} blocks=${mapped.body.length} images=${mapped.galleryImages.length + (mapped.heroImage ? 1 : 0)} translate=${skipTranslate ? 'skip' : 'queue'}`,
      );
    }
    return;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const sharedPassword =
    process.env.WORDPRESS_IMPORT_USER_PASSWORD?.trim() || '';
  if (importUsers && sharedPassword.length < 8) {
    throw new Error(
      'Set WORDPRESS_IMPORT_USER_PASSWORD in .env (min 8 characters) before importing users.',
    );
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const authorsByWpId = new Map<number, string>();
  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@prizn.local')
    .toLowerCase()
    .trim();

  try {
    if (importUsers) {
      const passwordHash = await bcrypt.hash(sharedPassword, 12);
      console.log(
        `CMS login password for imported users: ${sharedPassword}\nThey can change it under Profile after signing in.`,
      );
      for (const user of wpUsers) {
        const mapped = mapWpUser(user);
        const result = await importWpUser(prisma, mapped, {
          passwordHash,
          skipTranslate,
          adminEmail,
        });
        authorsByWpId.set(mapped.wpId, result.authorId);
        console.log(
          `[${result.action}] user #${mapped.wpId} ${mapped.email} → author ${result.authorId}`,
        );
      }
    }

    for (const post of posts) {
      const mapped = mapWpPost(post);
      const result = await saveArticle(prisma, mapped, {
        update: Boolean(flags.update),
        draft: Boolean(flags.draft),
        skipMedia: Boolean(flags['skip-media']),
        skipTranslate,
        skipCategories: Boolean(flags['skip-categories']),
        authorsByWpId,
      });
      console.log(
        `[${result.action}] #${mapped.wpId} ${mapped.path} (${result.id})`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  if (error instanceof Error && error.cause) {
    console.error(error.cause);
  }
  process.exit(1);
});
