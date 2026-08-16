import type { ArticleSection, ArticleStatus } from '@prisma/client';
import type { StoredArticleBlock } from '../articles/article.types';
import type { MappedWpUser } from './users';
import type { MappedWpArticle, WpInlineImage } from './types';

export const WP_PACKAGE_VERSION = 1;

export type PackagedCategory = {
  slug: string;
  nameBg: string;
};

export type PackagedAuthor = MappedWpUser;

export type WordpressPackage = {
  version: number;
  origin: string;
  exportedAt: string;
  articles: MappedWpArticle[];
  authors: PackagedAuthor[];
  categories: PackagedCategory[];
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function isWordpressPackage(raw: unknown): boolean {
  const record = asRecord(raw);
  if (record && Array.isArray(record.articles)) {
    return record.articles.some(isPackagedArticle);
  }
  return Array.isArray(raw) && raw.some(isPackagedArticle);
}

function isPackagedArticle(value: unknown): boolean {
  const record = asRecord(value);
  return Boolean(
    record &&
      typeof record.titleBg === 'string' &&
      Array.isArray(record.body) &&
      typeof record.slug === 'string',
  );
}

export function categoriesFromArticles(
  articles: MappedWpArticle[],
): PackagedCategory[] {
  const bySlug = new Map<string, string>();
  for (const article of articles) {
    for (const slug of article.categorySlugs) {
      if (!bySlug.has(slug)) {
        bySlug.set(
          slug,
          slug === article.categorySlugs[0] ? article.categoryBg : slug,
        );
      }
    }
    if (article.categorySlugs[0] && article.categoryBg) {
      bySlug.set(article.categorySlugs[0], article.categoryBg);
    }
  }
  return [...bySlug.entries()].map(([slug, nameBg]) => ({ slug, nameBg }));
}

export function articleToExportJson(article: MappedWpArticle): JsonRecord {
  return {
    wpId: article.wpId,
    slug: article.slug,
    section: article.section,
    path: article.path,
    status: article.status,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    categoryBg: article.categoryBg,
    categorySlugs: article.categorySlugs,
    categories: article.categorySlugs,
    titleBg: article.titleBg,
    subtitleBg: article.subtitleBg,
    readTimeBg: article.readTimeBg,
    dateBg: article.dateBg,
    photoCreditBg: article.photoCreditBg,
    seoTitleBg: article.seoTitleBg,
    seoDescriptionBg: article.seoDescriptionBg,
    body: article.body,
    authorNameBg: article.authorNameBg,
    authorSlug: article.authorSlug,
    authorBioBg: article.authorBioBg,
    wpAuthorId: article.wpAuthorId,
    author: {
      name: article.authorNameBg,
      slug: article.authorSlug,
      wpId: article.wpAuthorId,
    },
    heroImage: article.heroImage,
    galleryImages: article.galleryImages,
    tagNames: article.tagNames,
    images: [
      article.heroImage,
      ...article.galleryImages,
    ].filter((image): image is WpInlineImage => Boolean(image)),
  };
}

function parseImage(value: unknown): WpInlineImage | null {
  const record = asRecord(value);
  const src = asString(record?.src) || asString(record?.url) || '';
  const file = asString(record?.file);
  if (!src && !file) return null;
  return {
    src,
    caption: asString(record?.caption) ?? '',
    alt: asString(record?.alt) ?? '',
    ...(file ? { file } : {}),
  };
}

function parseArticle(raw: unknown): MappedWpArticle {
  const record = asRecord(raw);
  if (!record) throw new Error('Invalid packaged article');
  const author = asRecord(record.author);
  const publishedAtRaw = record.publishedAt;
  const publishedAt =
    typeof publishedAtRaw === 'string' && publishedAtRaw
      ? new Date(publishedAtRaw)
      : publishedAtRaw instanceof Date
        ? publishedAtRaw
        : null;

  return {
    wpId: Number(record.wpId ?? 0),
    slug: String(record.slug ?? ''),
    section: record.section as ArticleSection,
    path: String(record.path ?? ''),
    status: (record.status as ArticleStatus) || 'PUBLISHED',
    publishedAt:
      publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
    categoryBg: String(record.categoryBg ?? 'Човешки истории'),
    categorySlugs: Array.isArray(record.categorySlugs)
      ? record.categorySlugs.filter((slug): slug is string => typeof slug === 'string')
      : Array.isArray(record.categories)
        ? record.categories.filter((slug): slug is string => typeof slug === 'string')
        : [],
    titleBg: String(record.titleBg ?? ''),
    subtitleBg: String(record.subtitleBg ?? ''),
    readTimeBg: String(record.readTimeBg ?? ''),
    dateBg: String(record.dateBg ?? ''),
    photoCreditBg: String(record.photoCreditBg ?? ''),
    seoTitleBg: asString(record.seoTitleBg) ?? null,
    seoDescriptionBg: asString(record.seoDescriptionBg) ?? null,
    body: (record.body ?? []) as StoredArticleBlock[],
    authorNameBg:
      asString(record.authorNameBg) || asString(author?.name) || 'Редакция',
    authorSlug: asString(record.authorSlug) || asString(author?.slug) || 'redakcia',
    authorBioBg: asString(record.authorBioBg) ?? null,
    heroImage: parseImage(record.heroImage),
    galleryImages: Array.isArray(record.galleryImages)
      ? record.galleryImages
          .map(parseImage)
          .filter((image): image is WpInlineImage => Boolean(image))
      : [],
    tagNames: Array.isArray(record.tagNames)
      ? record.tagNames.filter(
          (tag): tag is { slug: string; nameBg: string } =>
            Boolean(asRecord(tag)?.slug && asRecord(tag)?.nameBg),
        )
      : [],
    wpAuthorId:
      typeof record.wpAuthorId === 'number'
        ? record.wpAuthorId
        : typeof author?.wpId === 'number'
          ? author.wpId
          : null,
  };
}

export function parseAuthorsJson(raw: unknown): PackagedAuthor[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(asRecord(raw)?.authors)
      ? (asRecord(raw)!.authors as unknown[])
      : [];
  return list.map((item) => {
    const record = asRecord(item) ?? {};
    return {
      wpId: Number(record.wpId ?? record.id ?? 0),
      email: String(record.email ?? ''),
      name: String(record.name ?? ''),
      slug: String(record.slug ?? ''),
      bioBg: asString(record.bioBg) ?? null,
      imageUrl: asString(record.imageUrl) ?? null,
      imageFile: asString(record.imageFile),
      role: (record.role as PackagedAuthor['role']) || 'AUTHOR',
    };
  });
}

export function parseCategoriesJson(raw: unknown): PackagedCategory[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(asRecord(raw)?.categories)
      ? (asRecord(raw)!.categories as unknown[])
      : [];
  return list
    .map((item) => {
      const record = asRecord(item);
      const slug = asString(record?.slug);
      if (!slug) return null;
      return { slug, nameBg: asString(record?.nameBg) || slug };
    })
    .filter((row): row is PackagedCategory => Boolean(row));
}

export function parseArticlesFile(raw: unknown): {
  origin?: string;
  articles: MappedWpArticle[];
} {
  const record = asRecord(raw);
  if (record && Array.isArray(record.articles)) {
    return {
      origin: asString(record.origin),
      articles: record.articles.map(parseArticle),
    };
  }
  if (Array.isArray(raw)) {
    return { articles: raw.map(parseArticle) };
  }
  throw new Error(
    'Expected a WordPress export package ({ articles: [...] }) or an array of mapped articles.',
  );
}

export function buildWordpressPackage(input: {
  origin: string;
  articles: MappedWpArticle[];
  authors: PackagedAuthor[];
  categories?: PackagedCategory[];
}): WordpressPackage {
  return {
    version: WP_PACKAGE_VERSION,
    origin: input.origin,
    exportedAt: new Date().toISOString(),
    articles: input.articles,
    authors: input.authors,
    categories: input.categories ?? categoriesFromArticles(input.articles),
  };
}
