/**
 * Import WordPress REST users + posts into the current journal (Prisma + MinIO).
 *
 * Import all WP users, then 20 published posts (no auto-translate):
 *   npm run import:wordpress --prefix api -- --users --limit=20
 *
 * Single post:
 *   npx ts-node --transpile-only src/wordpress-import/import-wordpress.ts --slug=...
 */
import { createHash } from 'crypto';
import { config } from 'dotenv';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type ArticleSection } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as Minio from 'minio';
import { mapWpPost, parseWpPostsJson } from './map';
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

const UA = 'PriznsWordpressImport/1.0';

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

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }

  return {
    body: await response.json(),
    headers: response.headers,
  };
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

async function loadPosts(flags: Flags): Promise<WpPost[]> {
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

  const posts: WpPost[] = [];
  const perPage = 50;
  const limit = flags.limit ? Number(flags.limit) : Number.POSITIVE_INFINITY;
  let page = 1;
  let totalPages = 1;

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
    if (batch.length === 0 || flags.slug) break;
    page += 1;
  }

  return posts.slice(0, Number.isFinite(limit) ? limit : posts.length);
}

function mediaKey(image: WpInlineImage, hintId?: number): string {
  const file =
    image.src.split('/').pop()?.split('?')[0]?.replace(/[^a-zA-Z0-9._-]/g, '') ||
    'image.jpg';
  if (hintId) return `wp/${hintId}/${file}`;
  const hash = createHash('sha1').update(image.src).digest('hex').slice(0, 12);
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
  opts: { skipMedia: boolean; hintId?: number },
): Promise<string | null> {
  const key = mediaKey(image, opts.hintId);
  const existing = await prisma.mediaAsset.findUnique({ where: { key } });
  if (existing) return existing.id;

  const originalName = key.split('/').pop() ?? 'image.jpg';
  let url = image.src;
  let size: number | null = null;
  let mimeType = mimeFromName(originalName);

  if (!opts.skipMedia) {
    const minio = createMinio();
    try {
      const response = await fetch(image.src, { headers: { 'User-Agent': UA } });
      if (!response.ok) throw new Error(`download ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      size = buffer.length;
      mimeType = response.headers.get('content-type')?.split(';')[0] || mimeType;
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
        `  media kept remote (${image.src}): ${
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
  return created.id;
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
      data: { role: mapped.role },
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
          userId: user.id,
          sourceLang: 'bg',
          translationStatus,
        },
      });

  const action = existingUser ? 'linked' : 'created';
  return { authorId: author.id, action };
}

async function syncCategories(
  prisma: PrismaClient,
  articleId: string,
  slugs: string[],
) {
  const categories = await prisma.category.findMany({
    where: { slug: { in: slugs } },
    select: { id: true },
  });
  await prisma.articleCategory.deleteMany({ where: { articleId } });
  if (categories.length === 0) return;
  await prisma.articleCategory.createMany({
    data: categories.map((category) => ({
      articleId,
      categoryId: category.id,
    })),
    skipDuplicates: true,
  });
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
    authorsByWpId: Map<number, string>;
  },
) {
  const status = opts.draft ? 'DRAFT' : mapped.status;
  const author = await upsertAuthor(prisma, mapped, opts);
  const heroMediaId = mapped.heroImage
    ? await importImage(prisma, mapped.heroImage, { skipMedia: opts.skipMedia })
    : null;
  const galleryIds: string[] = [];
  for (const image of mapped.galleryImages) {
    const id = await importImage(prisma, image, { skipMedia: opts.skipMedia });
    if (id) galleryIds.push(id);
  }

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
    body: mapped.body,
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

  await syncCategories(prisma, row.id, mapped.categorySlugs);
  await syncTags(prisma, row.id, mapped.tagNames);

  return { id: row.id, action: existing ? ('updated' as const) : ('created' as const) };
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const origin = wpOrigin(
    flags.from || process.env.WORDPRESS_URL || 'https://prizni.bg',
  );
  const skipTranslate = !flags.translate;
  const importUsers = Boolean(flags.users);
  const postLimit = flags.limit
    ? flags.limit
    : importUsers
      ? '20'
      : undefined;

  const wpUsers = importUsers ? await loadUsers(origin) : [];
  const posts = await loadPosts({ ...flags, limit: postLimit });

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
  process.exit(1);
});
