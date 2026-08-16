import type { ArticleSection, ArticleStatus } from '@prisma/client';
import { slugify } from '../common/slug.util';
import { buildArticlePath } from '../articles/section.util';
import { decodeHtmlEntities, htmlToBlocks, stripHtml, toHttps } from './html';
import type {
  MappedWpArticle,
  WpEmbeddedAuthor,
  WpEmbeddedMedia,
  WpEmbeddedTerm,
  WpInlineImage,
  WpPost,
} from './types';

/** WP category slug → journal section (child slugs first). */
export const WP_SLUG_TO_SECTION: Record<string, ArticleSection> = {
  'mestni-legendi': 'sports',
  predstoyashto: 'sports',
  'sport-2': 'sports',
  novini: 'news',
  portreti: 'human_stories',
  intervyuta: 'human_stories',
  'ot-nashte-ora': 'human_stories',
  'tvoyata-duma': 'voices',
  'geroi-ot-arhivite-choveshki-istorii': 'human_stories',
  'choveshki-istorii': 'human_stories',
  'zdrave-ot-prirodata': 'traditions',
  'obichai-i-poveria': 'traditions',
  trapeza: 'traditions',
  tradicii: 'traditions',
  'istorichesko-nasledstvo': 'places',
  'kulturni-sredishta': 'places',
  otbivki: 'places',
  'prirodno-bogatstvo': 'places',
  'nashite-mesta': 'places',
  vidin: 'places',
  vratza: 'places',
  montana: 'places',
  'kauzi-sabitia': 'events',
  'kultura-sabitia': 'events',
  'kulturen-kalendar': 'events',
  sabitia: 'events',
  'digitalna-higiena': 'campaigns',
  kampanii: 'campaigns',
  opik: 'campaigns',
  video: 'video',
  biznes: 'news',
};

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
  for (const term of terms) {
    const slug = term.slug?.trim();
    if (slug && WP_SLUG_TO_SECTION[slug]) return WP_SLUG_TO_SECTION[slug];
  }
  return 'human_stories';
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
      slug: embedded.slug?.trim() || slugify(embedded.name),
      bioBg: embedded.description?.trim() || null,
    };
  }

  const yoastPerson = personFromYoast(post);
  if (yoastPerson) return { nameBg: yoastPerson.name, slug: yoastPerson.slug, bioBg: yoastPerson.bio };

  const yoastName = post.yoast_head_json?.author?.trim();
  if (yoastName) {
    return { nameBg: yoastName, slug: slugify(yoastName), bioBg: null };
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
    src: toHttps(media.source_url),
    caption: captionFromMedia(media),
    alt: media.alt_text?.trim() ?? '',
  };
}

function seoTitle(post: WpPost, titleBg: string): string | null {
  const raw = post.yoast_head_json?.title?.trim();
  if (!raw) return titleBg || null;
  return raw.replace(/\s*\|\s*Prizni\.bg\s*$/i, '').trim() || titleBg;
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
  const titleBg = stripHtml(renderedText(post.title));
  const excerpt = stripHtml(renderedText(post.excerpt)).replace(/…+$/g, '').trim();
  const contentHtml = renderedText(post.content);
  const categories = categoryTerms(post);
  const section = pickSection(categories);
  const slug = (post.slug || slugify(titleBg)).trim();
  const author = pickAuthor(post);
  const parsedBody = htmlToBlocks(contentHtml, { quoteCiteBg: '' });
  const hero = featuredImage(post);
  const galleryImages = parsedBody.images.filter((image) => image.src !== hero?.src);
  const photoCreditBg =
    hero?.caption || galleryImages.find((image) => image.caption)?.caption || '';
  const publishedAtRaw = post.date_gmt || post.date;
  const publishedAt = publishedAtRaw ? new Date(publishedAtRaw) : null;
  const bodyText = parsedBody.blocks
    .map((block) => ('textBg' in block ? block.textBg : ''))
    .join(' ');

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
    subtitleBg: excerpt,
    readTimeBg: estimateReadTimeBg(
      bodyText,
      post.yoast_head_json?.twitter_misc?.['Est. reading time'],
    ),
    dateBg: formatDateBg(publishedAtRaw),
    photoCreditBg,
    seoTitleBg: seoTitle(post, titleBg),
    seoDescriptionBg: post.yoast_head_json?.description?.trim() || excerpt || null,
    body: parsedBody.blocks,
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
