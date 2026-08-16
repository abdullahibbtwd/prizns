import type { ArticleSection, ArticleStatus } from '@prisma/client';
import type { StoredArticleBlock } from '../articles/article.types';

/** Minimal WP REST post shape (`/wp-json/wp/v2/posts?_embed=1`). */
export type WpRendered = { rendered?: string; protected?: boolean };

export type WpEmbeddedTerm = {
  id?: number;
  name?: string;
  slug?: string;
  taxonomy?: string;
};

export type WpEmbeddedMedia = {
  id?: number;
  source_url?: string;
  alt_text?: string;
  caption?: WpRendered | string;
  mime_type?: string;
  media_details?: {
    file?: string;
    sizes?: Record<string, { source_url?: string; file?: string }>;
  };
};

export type WpEmbeddedAuthor = {
  id?: number;
  name?: string;
  slug?: string;
  description?: string;
  code?: string;
};

export type WpYoast = {
  title?: string;
  description?: string;
  author?: string;
  twitter_misc?: Record<string, string>;
  schema?: { '@graph'?: Array<Record<string, unknown>> };
};

export type WpPost = {
  id: number;
  date?: string;
  date_gmt?: string;
  slug?: string;
  status?: string;
  link?: string;
  title?: WpRendered | string;
  content?: WpRendered | string;
  excerpt?: WpRendered | string;
  author?: number;
  featured_media?: number;
  categories?: number[];
  tags?: number[];
  class_list?: string[];
  yoast_head_json?: WpYoast;
  _embedded?: {
    author?: WpEmbeddedAuthor[];
    'wp:featuredmedia'?: WpEmbeddedMedia[];
    'wp:term'?: WpEmbeddedTerm[][];
  };
};

export type WpInlineImage = {
  src: string;
  caption: string;
  alt: string;
};

export type MappedWpArticle = {
  wpId: number;
  slug: string;
  section: ArticleSection;
  path: string;
  status: ArticleStatus;
  publishedAt: Date | null;
  categoryBg: string;
  categorySlugs: string[];
  titleBg: string;
  subtitleBg: string;
  readTimeBg: string;
  dateBg: string;
  photoCreditBg: string;
  seoTitleBg: string | null;
  seoDescriptionBg: string | null;
  body: StoredArticleBlock[];
  authorNameBg: string;
  authorSlug: string;
  authorBioBg: string | null;
  heroImage: WpInlineImage | null;
  galleryImages: WpInlineImage[];
  tagNames: Array<{ slug: string; nameBg: string }>;
  wpAuthorId: number | null;
};

export type WpUser = {
  id: number;
  name?: string;
  slug?: string;
  email?: string;
  description?: string;
  url?: string;
  roles?: string[];
  avatar_urls?: Record<string, string>;
};
