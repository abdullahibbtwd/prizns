import type { ArticleSection, ArticleStatus } from '@prisma/client';
import { slugify } from '../common/slug.util';
import { buildArticlePath } from '../articles/section.util';
import { resolveCategoryPlacement } from '../categories/canonical-categories';
import {
  CATEGORY_SLUG_TO_SECTION,
  sectionFromCategorySlugs,
} from '../categories/category-section';
import { decodeHtmlEntities, htmlToBlocks, stripHtml, toHttps } from './html';
import { preferShareImageUrl } from '../common/share-image.util';
import { fixMixedScriptLookalikes } from '../common/cyrillic-latin-fold';
import { canonicalAuthorSlug } from './author-slug-aliases';
import type {
  MappedWpArticle,
  WpEmbeddedAuthor,
  WpEmbeddedMedia,
  WpEmbeddedTerm,
  WpInlineImage,
  WpPost,
} from './types';

/** @deprecated Use CATEGORY_SLUG_TO_SECTION */
export const WP_SLUG_TO_SECTION = CATEGORY_SLUG_TO_SECTION;

const MONTHS_BG = [
  'януари',
  'февруари',
  'март',
  'април',
  'май',
  'юни',
  'юли',
  'август',
  'септември',
  'октомври',
  'ноември',
  'декември',
];

export function renderedText(value: unknown): string {
  if (typeof value === 'string') return decodeHtmlEntities(value).trim();
  if (value && typeof value === 'object' && 'rendered' in value) {
    return decodeHtmlEntities(String((value as { rendered?: string }).rendered ?? '')).trim();
  }
  return '';
}

export function formatDateBg(iso: string | undefined): string {
  if (!iso) return '';
  const ymd = iso.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    const month = MONTHS_BG[Number(ymd[2]) - 1];
    return `${Number(ymd[3])} ${month} ${ymd[1]}`;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const month = MONTHS_BG[date.getUTCMonth()];
  return `${date.getUTCDate()} ${month} ${date.getUTCFullYear()}`;
}

export function wpStatusToArticleStatus(status: string | undefined): ArticleStatus {
  switch (status) {
    case 'publish':
      return 'PUBLISHED';
    case 'future':
      return 'SCHEDULED';
    case 'pending':
      return 'REVIEW';
    case 'draft':
    case 'private':
    default:
      return 'DRAFT';
  }
}

export function estimateReadTimeBg(text: string, yoastMinutes?: string): string {
  const fromYoast = yoastMinutes?.match(/(\d+)/)?.[1];
  if (fromYoast) return `${fromYoast} мин четене`;
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} мин четене`;
}

function termsFromEmbed(post: WpPost): WpEmbeddedTerm[] {
  const groups = post._embedded?.['wp:term'] ?? [];
  return groups.flat().filter((term) => term && !('code' in term));
}

export function categoryTerms(post: WpPost): WpEmbeddedTerm[] {
  const terms = termsFromEmbed(post).filter(
    (term) => !term.taxonomy || term.taxonomy === 'category',
  );
  if (terms.length > 0) return terms;

  const fromClass = (post.class_list ?? [])
    .map((item) => item.match(/^category-(.+)$/)?.[1])
    .filter((slug): slug is string => Boolean(slug));
  return fromClass.map((slug) => ({ slug, name: slug, taxonomy: 'category' }));
}

export function tagTerms(post: WpPost): WpEmbeddedTerm[] {
  return termsFromEmbed(post).filter((term) => term.taxonomy === 'post_tag');
}

export function pickSection(terms: WpEmbeddedTerm[]): ArticleSection {
  const placement = resolveCategoryPlacement(terms.map((term) => term.slug));
  return sectionFromCategorySlugs(placement.categorySlugs);
}

function personFromYoast(post: WpPost): { name: string; slug: string; bio: string | null } | null {
  const graph = post.yoast_head_json?.schema?.['@graph'] ?? [];
  for (const node of graph) {
    if (node['@type'] !== 'Person' || typeof node.name !== 'string') continue;
    const url = typeof node.url === 'string' ? node.url : '';
    const slugMatch = url.match(/\/author\/([^/]+)\/?$/);
    return {
      name: node.name.trim(),
      slug: slugMatch?.[1] || slugify(node.name),
      bio: typeof node.description === 'string' ? node.description.trim() : null,
    };
  }
  return null;
}

export function pickAuthor(post: WpPost): {
  nameBg: string;
  slug: string;
  bioBg: string | null;
} {
  const embedded = (post._embedded?.author ?? []).find(
    (row): row is WpEmbeddedAuthor => Boolean(row?.name) && row.code !== 'rest_user_invalid_id',
  );
  if (embedded?.name) {
    return {
      nameBg: embedded.name.trim(),
      slug: canonicalAuthorSlug(embedded.slug?.trim() || slugify(embedded.name)),
      bioBg: embedded.description?.trim() || null,
    };
  }

  const yoastPerson = personFromYoast(post);
  if (yoastPerson) {
    return {
      nameBg: yoastPerson.name,
      slug: canonicalAuthorSlug(yoastPerson.slug),
      bioBg: yoastPerson.bio,
    };
  }

  const yoastName = post.yoast_head_json?.author?.trim();
  if (yoastName) {
    return {
      nameBg: yoastName,
      slug: canonicalAuthorSlug(slugify(yoastName)),
      bioBg: null,
    };
  }

  return { nameBg: 'Редакция', slug: 'redakcia', bioBg: null };
}

function captionFromMedia(media: WpEmbeddedMedia | undefined): string {
  if (!media) return '';
  if (typeof media.caption === 'string') return stripHtml(media.caption);
  return stripHtml(media.caption?.rendered ?? '');
}

export function featuredImage(post: WpPost): WpInlineImage | null {
  const media = post._embedded?.['wp:featuredmedia']?.find(
    (row) => row && typeof row.source_url === 'string',
  );
  if (!media?.source_url) return null;
  return {
    src: preferShareImageUrl(toHttps(media.source_url)) || toHttps(media.source_url),
    caption: captionFromMedia(media),
    alt: media.alt_text?.trim() ?? '',
  };
}

function cleanBgText(value: string): string {
  return fixMixedScriptLookalikes(value) ?? value;
}

/** WP auto-excerpts often end mid-sentence with an ellipsis or dangling word. */
export function excerptLooksTruncated(raw: string, cleaned: string): boolean {
  const source = raw.trim();
  const text = cleaned.trim();
  if (!text) return false;
  if (/…|\.\.\.|&#8230;/i.test(source)) return true;
  const endsSentence = /[.!?]["»')\]]*$/u.test(text);
  if (endsSentence) return false;
  // Mid-cut: dangling conjunction/preposition, or longer text without a stop.
  if (
    /\b(да|и|на|за|с|в|от|към|по|че|се|the|a|an|of|to|and|or|in|for|with)\s*$/iu.test(
      text,
    )
  ) {
    return true;
  }
  if (text.length >= 40) return true;
  return false;
}

/** Prefer complete sentences up to maxLen; fall back to a word boundary. */
export function truncateAtSentenceBoundary(
  text: string,
  maxLen = 240,
): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= maxLen) return normalized;

  const sentences = normalized.split(/(?<=[.!?])\s+/);
  const kept: string[] = [];
  for (const sentence of sentences) {
    const next = kept.length ? `${kept.join(' ')} ${sentence}` : sentence;
    if (next.length > maxLen && kept.length > 0) break;
    kept.push(sentence);
    if (kept.join(' ').length >= Math.min(120, maxLen) && /[.!?]$/.test(sentence)) {
      break;
    }
  }
  let result = kept.join(' ').trim() || normalized.slice(0, maxLen);
  if (result.length > maxLen) {
    const cut = result.slice(0, maxLen);
    const space = cut.lastIndexOf(' ');
    result = (space > 80 ? cut.slice(0, space) : cut).replace(/[,;:—\-\s]+$/u, '');
    if (!/[.!?]$/.test(result)) result = `${result}…`;
  }
  return result;
}

function firstBodyPlainText(
  blocks: Array<{ type?: string; textBg?: string; captionBg?: string }>,
): string {
  for (const block of blocks) {
    if (block.type === 'paragraph' && block.textBg?.trim()) {
      return stripHtml(block.textBg);
    }
  }
  return blocks
    .map((block) =>
      block.type === 'image' ? block.captionBg ?? '' : block.textBg ?? '',
    )
    .join(' ');
}

export function buildSubtitleBg(opts: {
  excerptHtml: string;
  yoastDescription?: string | null;
  bodyPlain: string;
}): string {
  const rawExcerpt = stripHtml(opts.excerptHtml).trim();
  const excerpt = cleanBgText(
    rawExcerpt.replace(/…+$/g, '').replace(/\.{3}$/g, '').trim(),
  );
  const yoast = cleanBgText((opts.yoastDescription ?? '').trim());

  if (excerpt && !excerptLooksTruncated(rawExcerpt, excerpt)) {
    return excerpt;
  }
  const fromBody = truncateAtSentenceBoundary(
    cleanBgText(opts.bodyPlain),
    240,
  );
  if (fromBody) return fromBody;
  if (yoast && !excerptLooksTruncated(yoast, yoast)) {
    return yoast;
  }
  return excerpt || yoast;
}

function seoTitle(post: WpPost, titleBg: string): string | null {
  const raw = post.yoast_head_json?.title?.trim();
  if (!raw) return titleBg || null;
  const cleaned =
    raw.replace(/\s*\|\s*Prizni\.bg\s*$/i, '').trim() || titleBg;
  return cleanBgText(cleaned);
}

export function parseWpPostsJson(raw: unknown): WpPost[] {
  if (Array.isArray(raw)) return raw as WpPost[];
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    if (Array.isArray(record.posts)) return record.posts as WpPost[];
    if (typeof record.id === 'number' && record.content) return [raw as WpPost];
  }
  throw new Error('Expected a WP post object, an array of posts, or { posts: [...] }');
}

export function mapWpPost(post: WpPost): MappedWpArticle {
  const titleBg = cleanBgText(stripHtml(renderedText(post.title)));
  const contentHtml = renderedText(post.content);
  const categories = categoryTerms(post);
  const section = pickSection(categories);
  const slug = (post.slug || slugify(titleBg)).trim();
  const author = pickAuthor(post);
  const parsedBody = htmlToBlocks(contentHtml, { quoteCiteBg: '' });
  const hero = featuredImage(post);
  const galleryImages = parsedBody.images.filter((image) => image.src !== hero?.src);
  const heroSrc = hero?.src;
  const body = parsedBody.blocks.filter(
    (block) => !(block.type === 'image' && heroSrc && block.url === heroSrc),
  );
  const photoCreditBg =
    hero?.caption || galleryImages.find((image) => image.caption)?.caption || '';
  const publishedAtRaw = post.date_gmt || post.date;
  const publishedAt = publishedAtRaw ? new Date(publishedAtRaw) : null;
  const bodyText = firstBodyPlainText(body);
  const subtitleBg = buildSubtitleBg({
    excerptHtml: renderedText(post.excerpt),
    yoastDescription: post.yoast_head_json?.description,
    bodyPlain: bodyText,
  });
  const seoDescriptionRaw =
    post.yoast_head_json?.description?.trim() || subtitleBg || null;
  const seoDescriptionBg = seoDescriptionRaw
    ? excerptLooksTruncated(seoDescriptionRaw, seoDescriptionRaw)
      ? subtitleBg
      : cleanBgText(seoDescriptionRaw)
    : null;

  return {
    wpId: post.id,
    slug,
    section,
    path: buildArticlePath(section, slug),
    status: wpStatusToArticleStatus(post.status),
    publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
    categoryBg: categories[0]?.name?.trim() || 'Човешки истории',
    categorySlugs: categories
      .map((term) => term.slug?.trim())
      .filter((slug): slug is string => Boolean(slug)),
    titleBg,
    subtitleBg,
    readTimeBg: estimateReadTimeBg(
      bodyText,
      post.yoast_head_json?.twitter_misc?.['Est. reading time'],
    ),
    dateBg: formatDateBg(publishedAtRaw),
    photoCreditBg,
    seoTitleBg: seoTitle(post, titleBg),
    seoDescriptionBg,
    body,
    authorNameBg: author.nameBg,
    authorSlug: author.slug,
    authorBioBg: author.bioBg,
    heroImage: hero,
    galleryImages,
    tagNames: tagTerms(post)
      .filter((term) => term.slug && term.name)
      .map((term) => ({ slug: term.slug!, nameBg: term.name! })),
    wpAuthorId: typeof post.author === 'number' ? post.author : null,
  };
}
