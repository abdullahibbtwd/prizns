import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ArticleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toPrismaSectionFilter } from '../articles/section.util';
import {
  absoluteShareUrl,
} from '../common/share-image.util';

const STATIC_ROUTES = [
  '/',
  '/stories',
  '/places',
  '/traditions',
  '/sports',
  '/events',
  '/news',
  '/why-prizni',
  '/write-for-us',
  '/support',
  '/partnerships',
  '/story-of-the-year',
  '/discover',
  '/voices',
  '/authors',
  '/shop',
  '/contact',
  '/gallery',
  '/video',
  '/campaigns',
  '/archive',
] as const;

const CONTENT_SECTIONS = new Set([
  'stories',
  'places',
  'traditions',
  'discover',
  'voices',
  'sports',
  'events',
  'news',
  'video',
  'campaigns',
  'gallery',
]);

const SITE_NAME = 'Prizni';
const DEFAULT_DESCRIPTION =
  'Prizni — човешки истории, места и традиции от Северозападна България.';
const NOT_FOUND_TITLE = 'Страницата не е намерена';
const NOT_FOUND_DESCRIPTION =
  'Тази връзка не води към публикувана страница в Prizni.';
const NOT_FOUND_TITLE_EN = 'Page not found';
const NOT_FOUND_DESCRIPTION_EN =
  'This link does not match a published page on Prizni.';

export type BotShellResult = {
  html: string;
  status: number;
};

@Injectable()
export class SeoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private siteUrl(): string {
    const raw =
      this.config.get<string>('PUBLIC_SITE_URL')?.trim() ||
      'http://localhost:5175';
    return raw.replace(/\/+$/, '');
  }

  /** CMS desk: coverage from the same HTML shell production serves (bot-shell), not DB field presence alone. */
  async cmsOverview() {
    const base = this.siteUrl();
    const published = await this.prisma.article.findMany({
      where: { status: ArticleStatus.PUBLISHED },
      select: {
        id: true,
        path: true,
        section: true,
        titleBg: true,
        titleEn: true,
        subtitleBg: true,
        subtitleEn: true,
        seoTitleBg: true,
        seoTitleEn: true,
        seoDescriptionBg: true,
        seoDescriptionEn: true,
        publishedAt: true,
        updatedAt: true,
        heroMedia: { select: { url: true } },
        author: { select: { nameBg: true, nameEn: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const rows = published.map((article) => {
      const path = article.path.startsWith('/')
        ? article.path
        : `/${article.path}`;
      const lang = 'bg' as const;
      const localized = this.localizedPath(path, lang);
      const canonical = `${base}${localized === '/' ? '' : localized}`;
      const title =
        this.pickLocalized(lang, article.seoTitleBg, article.seoTitleEn) ||
        this.pickLocalized(lang, article.titleBg, article.titleEn) ||
        SITE_NAME;
      const description =
        this.pickLocalized(
          lang,
          article.seoDescriptionBg,
          article.seoDescriptionEn,
        ) ||
        this.pickLocalized(lang, article.subtitleBg, article.subtitleEn) ||
        DEFAULT_DESCRIPTION;
      const image =
        absoluteShareUrl(base, article.heroMedia?.url) ||
        `${base}/og-default.png`;
      const authorName =
        this.pickLocalized(
          lang,
          article.author?.nameBg,
          article.author?.nameEn,
        ) || undefined;
      const fullTitle = `${title} | ${SITE_NAME}`;
      const html = this.renderHtml({
        title: fullTitle,
        description,
        canonical,
        barePath: path,
        lang,
        image,
        type: 'article',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: title,
          description,
          image: [image],
          datePublished: article.publishedAt?.toISOString(),
          dateModified: article.updatedAt.toISOString(),
          mainEntityOfPage: canonical,
          author: authorName
            ? { '@type': 'Person', name: authorName }
            : { '@type': 'Organization', name: SITE_NAME },
          publisher: {
            '@type': 'Organization',
            name: SITE_NAME,
            url: base,
            logo: `${base}/prizni.svg`,
          },
        },
      });

      const hasTitle =
        title !== SITE_NAME &&
        html.includes(`<title>${this.escapeHtml(fullTitle)}</title>`);
      const hasDescription =
        description !== DEFAULT_DESCRIPTION &&
        html.includes(`content="${this.escapeHtml(description)}"`);
      const hasOg = html.includes('property="og:title"');
      const hasJsonLd =
        html.includes('application/ld+json') &&
        html.includes('"@type":"Article"');
      const shellOk = hasTitle && hasDescription && hasOg && hasJsonLd;

      return {
        id: article.id,
        path,
        section: article.section,
        titleBg: article.titleBg,
        titleEn: article.titleEn,
        hasTitle,
        hasDescription,
        shellOk,
      };
    });

    const missingTitle = rows.filter((row) => !row.hasTitle).length;
    const missingDescription = rows.filter((row) => !row.hasDescription).length;
    const withUniqueMeta = rows.filter((row) => row.shellOk).length;
    const coveragePct =
      rows.length === 0
        ? 100
        : Math.round((withUniqueMeta / rows.length) * 100);

    return {
      siteUrl: base,
      sitemapUrl: `${base}/sitemap.xml`,
      robotsUrl: `${base}/robots.txt`,
      feedUrl: `${base}/feed.xml`,
      published: rows.length,
      withUniqueMeta,
      missingTitle,
      missingDescription,
      coveragePct,
      evergreen: {
        traditions: published.filter((article) => article.section === 'traditions')
          .length,
        places: published.filter((article) => article.section === 'places').length,
      },
      gaps: rows
        .filter((row) => !row.shellOk)
        .slice(0, 50)
        .map(({ shellOk: _shellOk, ...gap }) => gap),
    };
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private normalizePath(raw?: string): string {
    const trimmed = (raw ?? '/').trim() || '/';
    try {
      const decoded = decodeURIComponent(trimmed);
      const withSlash = decoded.startsWith('/') ? decoded : `/${decoded}`;
      const noQuery = withSlash.split('?')[0] || '/';
      // English locale prefix is URL-only; content paths stay unprefixed in the DB.
      if (noQuery === '/en') return '/';
      if (noQuery.startsWith('/en/')) return noQuery.slice(3) || '/';
      return noQuery;
    } catch {
      const fallback = trimmed.startsWith('/')
        ? trimmed.split('?')[0]
        : `/${trimmed}`;
      if (fallback === '/en') return '/';
      if (fallback.startsWith('/en/')) return fallback.slice(3) || '/';
      return fallback;
    }
  }

  private requestLocale(raw?: string): 'bg' | 'en' {
    const trimmed = (raw ?? '/').trim() || '/';
    try {
      const decoded = decodeURIComponent(trimmed);
      const withSlash = decoded.startsWith('/') ? decoded : `/${decoded}`;
      const noQuery = withSlash.split('?')[0] || '/';
      if (noQuery === '/en' || noQuery.startsWith('/en/')) return 'en';
      return 'bg';
    } catch {
      if (trimmed === '/en' || trimmed.startsWith('/en/')) return 'en';
      return 'bg';
    }
  }

  private localizedPath(barePath: string, lang: 'bg' | 'en'): string {
    if (lang === 'en') return barePath === '/' ? '/en' : `/en${barePath}`;
    return barePath === '/' ? '/' : barePath;
  }

  private pickLocalized(
    lang: 'bg' | 'en',
    bg?: string | null,
    en?: string | null,
  ): string {
    if (lang === 'en') {
      const english = en?.trim();
      if (english) return english;
    }
    return bg?.trim() || en?.trim() || '';
  }

  async sitemapXml(): Promise<string> {
    const base = this.siteUrl();
    const articles = await this.prisma.article.findMany({
      where: { status: ArticleStatus.PUBLISHED },
      select: { path: true, updatedAt: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
    });

    const urls: Array<{ loc: string; lastmod?: string }> = [
      ...STATIC_ROUTES.map((path) => ({ loc: `${base}${path}` })),
      ...articles.map((article) => ({
        loc: `${base}${article.path.startsWith('/') ? article.path : `/${article.path}`}`,
        lastmod: (article.updatedAt ?? article.publishedAt ?? new Date())
          .toISOString()
          .slice(0, 10),
      })),
    ];

    const body = urls
      .map((entry) => {
        const lastmod = entry.lastmod
          ? `\n    <lastmod>${entry.lastmod}</lastmod>`
          : '';
        return `  <url>\n    <loc>${this.escapeXml(entry.loc)}</loc>${lastmod}\n  </url>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  }

  private async publishedFeedArticles() {
    return this.prisma.article.findMany({
      where: { status: ArticleStatus.PUBLISHED },
      select: {
        id: true,
        path: true,
        titleBg: true,
        titleEn: true,
        subtitleBg: true,
        subtitleEn: true,
        seoDescriptionBg: true,
        seoDescriptionEn: true,
        publishedAt: true,
        updatedAt: true,
        author: { select: { nameBg: true, nameEn: true } },
        heroMedia: { select: { url: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    });
  }

  private articleAbsUrl(path: string): string {
    const base = this.siteUrl();
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalized}`;
  }

  private articleTitle(row: {
    titleEn: string | null;
    titleBg: string;
  }): string {
    return (row.titleEn?.trim() || row.titleBg).trim();
  }

  private articleDescription(row: {
    seoDescriptionEn: string | null;
    seoDescriptionBg: string | null;
    subtitleEn: string | null;
    subtitleBg: string;
  }): string {
    return (
      row.seoDescriptionEn?.trim() ||
      row.seoDescriptionBg?.trim() ||
      row.subtitleEn?.trim() ||
      row.subtitleBg.trim() ||
      DEFAULT_DESCRIPTION
    );
  }

  /** RSS 2.0 — thin syndication wrapper over published stories. */
  async rssXml(): Promise<string> {
    const base = this.siteUrl();
    const articles = await this.publishedFeedArticles();
    const lastBuild = (
      articles[0]?.publishedAt ??
      articles[0]?.updatedAt ??
      new Date()
    ).toUTCString();

    const items = articles
      .map((article) => {
        const link = this.articleAbsUrl(article.path);
        const title = this.escapeXml(this.articleTitle(article));
        const description = this.escapeXml(this.articleDescription(article));
        const pubDate = (
          article.publishedAt ??
          article.updatedAt
        ).toUTCString();
        const author =
          article.author?.nameEn?.trim() ||
          article.author?.nameBg?.trim() ||
          SITE_NAME;
        const enclosure = article.heroMedia?.url?.trim()
          ? `\n      <enclosure url="${this.escapeXml(article.heroMedia.url.trim())}" type="image/jpeg" />`
          : '';
        return `    <item>
      <title>${title}</title>
      <link>${this.escapeXml(link)}</link>
      <guid isPermaLink="true">${this.escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
      <author>${this.escapeXml(author)}</author>${enclosure}
    </item>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME}</title>
    <link>${this.escapeXml(base)}</link>
    <description>${this.escapeXml(DEFAULT_DESCRIPTION)}</description>
    <language>bg</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${this.escapeXml(`${base}/feed.xml`)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
  }

  /** JSON Feed 1.1 — partner-friendly sibling of RSS. */
  async jsonFeed(): Promise<string> {
    const base = this.siteUrl();
    const articles = await this.publishedFeedArticles();
    const feed = {
      version: 'https://jsonfeed.org/version/1.1',
      title: SITE_NAME,
      home_page_url: base,
      feed_url: `${base}/feed.json`,
      description: DEFAULT_DESCRIPTION,
      language: 'bg',
      items: articles.map((article) => {
        const url = this.articleAbsUrl(article.path);
        const title = this.articleTitle(article);
        const summary = this.articleDescription(article);
        const authorName =
          article.author?.nameEn?.trim() ||
          article.author?.nameBg?.trim() ||
          undefined;
        return {
          id: article.id,
          url,
          title,
          summary,
          date_published: (
            article.publishedAt ?? article.updatedAt
          ).toISOString(),
          date_modified: article.updatedAt.toISOString(),
          authors: authorName ? [{ name: authorName }] : undefined,
          image: article.heroMedia?.url?.trim() || undefined,
        };
      }),
    };
    return `${JSON.stringify(feed, null, 2)}\n`;
  }

  robotsTxt(): string {
    const base = this.siteUrl();
    return [
      'User-agent: *',
      'Allow: /',
      `Sitemap: ${base}/sitemap.xml`,
      `# RSS: ${base}/feed.xml`,
      `# JSON Feed: ${base}/feed.json`,
      '',
    ].join('\n');
  }

  private async findPublishedArticle(path: string) {
    const byPath = await this.prisma.article.findFirst({
      where: {
        status: ArticleStatus.PUBLISHED,
        path,
      },
      include: {
        heroMedia: true,
        author: true,
      },
    });
    if (byPath) return byPath;

    const parts = path.split('/').filter(Boolean);
    if (parts.length !== 2) return null;
    const [section, slug] = parts;
    if (!CONTENT_SECTIONS.has(section)) return null;

    try {
      const sectionFilter = toPrismaSectionFilter(section);
      return this.prisma.article.findFirst({
        where: {
          status: ArticleStatus.PUBLISHED,
          slug,
          ...(sectionFilter ? { section: sectionFilter } : {}),
        },
        include: {
          heroMedia: true,
          author: true,
        },
      });
    } catch {
      return null;
    }
  }

  private isKnownStaticPath(path: string): boolean {
    return (STATIC_ROUTES as readonly string[]).includes(path);
  }

  private entityKind(
    path: string,
  ): 'article' | 'author' | 'shop' | 'none' {
    const parts = path.split('/').filter(Boolean);
    if (parts.length !== 2) return 'none';
    const [section] = parts;
    if (section === 'authors') return 'author';
    if (section === 'shop') return 'shop';
    if (CONTENT_SECTIONS.has(section)) return 'article';
    return 'none';
  }

  private notFoundShell(
    canonical: string,
    base: string,
    barePath: string,
    lang: 'bg' | 'en',
  ): BotShellResult {
    return {
      status: 404,
      html: this.renderHtml({
        title: `${lang === 'en' ? NOT_FOUND_TITLE_EN : NOT_FOUND_TITLE} | ${SITE_NAME}`,
        description:
          lang === 'en' ? NOT_FOUND_DESCRIPTION_EN : NOT_FOUND_DESCRIPTION,
        canonical,
        barePath,
        lang,
        image: `${base}/og-default.png`,
        type: 'website',
        noIndex: true,
      }),
    };
  }

  async botShellHtml(rawPath?: string): Promise<BotShellResult> {
    const base = this.siteUrl();
    const lang = this.requestLocale(rawPath);
    const path = this.normalizePath(rawPath);
    const localized = this.localizedPath(path, lang);
    const canonical = `${base}${localized === '/' ? '' : localized}`;
    const kind = this.entityKind(path);
    const parts = path.split('/').filter(Boolean);

    if (kind === 'article') {
      const article = await this.findPublishedArticle(path);
      if (!article) return this.notFoundShell(canonical, base, path, lang);

      const title =
        this.pickLocalized(lang, article.seoTitleBg, article.seoTitleEn) ||
        this.pickLocalized(lang, article.titleBg, article.titleEn) ||
        SITE_NAME;
      const description =
        this.pickLocalized(
          lang,
          article.seoDescriptionBg,
          article.seoDescriptionEn,
        ) ||
        this.pickLocalized(lang, article.subtitleBg, article.subtitleEn) ||
        DEFAULT_DESCRIPTION;
      const image =
        absoluteShareUrl(base, article.heroMedia?.url) ||
        `${base}/og-default.png`;
      const authorName =
        this.pickLocalized(
          lang,
          article.author?.nameBg,
          article.author?.nameEn,
        ) || undefined;
      const published = article.publishedAt?.toISOString();
      const modified = article.updatedAt.toISOString();

      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description,
        image: [image],
        datePublished: published,
        dateModified: modified,
        mainEntityOfPage: canonical,
        author: authorName
          ? { '@type': 'Person', name: authorName }
          : { '@type': 'Organization', name: SITE_NAME },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          url: base,
          logo: `${base}/prizni.svg`,
        },
      };

      return {
        status: 200,
        html: this.renderHtml({
          title: `${title} | ${SITE_NAME}`,
          description,
          canonical,
          barePath: path,
          lang,
          image,
          type: 'article',
          jsonLd,
        }),
      };
    }

    if (kind === 'author') {
      const slug = parts[1];
      const author = await this.prisma.author.findFirst({
        where: {
          isActive: true,
          OR: [{ slug }, { aliases: { has: slug } }],
        },
        select: {
          slug: true,
          nameBg: true,
          nameEn: true,
          bioBg: true,
          bioEn: true,
          imageUrl: true,
        },
      });
      if (!author) return this.notFoundShell(canonical, base, path, lang);
      const name =
        this.pickLocalized(lang, author.nameBg, author.nameEn) || SITE_NAME;
      const description =
        this.pickLocalized(lang, author.bioBg, author.bioEn) ||
        DEFAULT_DESCRIPTION;
      const image =
        absoluteShareUrl(base, author.imageUrl) || `${base}/og-default.png`;
      const authorPath = `/authors/${author.slug}`;
      const authorCanonical =
        lang === 'en' ? `${base}/en${authorPath}` : `${base}${authorPath}`;
      return {
        status: 200,
        html: this.renderHtml({
          title: `${name} | ${SITE_NAME}`,
          description,
          canonical: authorCanonical,
          barePath: authorPath,
          lang,
          image,
          type: 'website',
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'Person',
            name,
            description,
            image,
            url: authorCanonical,
          },
        }),
      };
    }

    if (kind === 'shop') {
      const slug = parts[1];
      const product = await this.prisma.product.findFirst({
        where: { slug, active: true },
        select: {
          titleBg: true,
          titleEn: true,
          descriptionBg: true,
          descriptionEn: true,
          imageMedia: { select: { url: true } },
        },
      });
      if (!product) return this.notFoundShell(canonical, base, path, lang);
      const title =
        this.pickLocalized(lang, product.titleBg, product.titleEn) ||
        SITE_NAME;
      const description =
        this.pickLocalized(lang, product.descriptionBg, product.descriptionEn) ||
        DEFAULT_DESCRIPTION;
      const image =
        absoluteShareUrl(base, product.imageMedia?.url) ||
        `${base}/og-default.png`;
      return {
        status: 200,
        html: this.renderHtml({
          title: `${title} | ${SITE_NAME}`,
          description,
          canonical,
          barePath: path,
          lang,
          image,
          type: 'website',
        }),
      };
    }

    if (!this.isKnownStaticPath(path)) {
      return this.notFoundShell(canonical, base, path, lang);
    }

    return {
      status: 200,
      html: this.renderHtml({
        title: SITE_NAME,
        description: DEFAULT_DESCRIPTION,
        canonical,
        barePath: path,
        lang,
        image: `${base}/og-default.png`,
        type: 'website',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: SITE_NAME,
          url: base,
          logo: `${base}/prizni.svg`,
          description: DEFAULT_DESCRIPTION,
        },
      }),
    };
  }

  private renderHtml(meta: {
    title: string;
    description: string;
    canonical: string;
    barePath: string;
    lang: 'bg' | 'en';
    image: string;
    type: 'article' | 'website';
    jsonLd?: Record<string, unknown>;
    noIndex?: boolean;
  }): string {
    const title = this.escapeHtml(meta.title);
    const description = this.escapeHtml(meta.description);
    const canonical = this.escapeHtml(meta.canonical);
    const image = this.escapeHtml(meta.image);
    const base = this.siteUrl();
    const bgPath = meta.barePath === '/' ? '' : meta.barePath;
    const enPath = meta.barePath === '/' ? '/en' : `/en${meta.barePath}`;
    const bgHref = this.escapeHtml(`${base}${bgPath}`);
    const enHref = this.escapeHtml(`${base}${enPath}`);
    const imageType = meta.image.toLowerCase().includes('.png')
      ? 'image/png'
      : 'image/jpeg';
    const robots = meta.noIndex
      ? '<meta name="robots" content="noindex,nofollow" />\n'
      : '';
    const jsonLdBlock = meta.jsonLd
      ? `<script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>`
      : '';
    const ogLocale = meta.lang === 'en' ? 'en_US' : 'bg_BG';
    const ogLocaleAlt = meta.lang === 'en' ? 'bg_BG' : 'en_US';

    return `<!DOCTYPE html>
<html lang="${meta.lang}">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<meta name="description" content="${description}" />
<link rel="canonical" href="${canonical}" />
<link rel="alternate" hreflang="bg" href="${bgHref}" />
<link rel="alternate" hreflang="en" href="${enHref}" />
<link rel="alternate" hreflang="x-default" href="${bgHref}" />
${robots}<meta property="og:site_name" content="${SITE_NAME}" />
<meta property="og:type" content="${meta.type}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:image" content="${image}" />
<meta property="og:image:alt" content="${title}" />
<meta property="og:image:type" content="${imageType}" />
<meta property="og:locale" content="${ogLocale}" />
<meta property="og:locale:alternate" content="${ogLocaleAlt}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${image}" />
<meta name="twitter:image:alt" content="${title}" />
${jsonLdBlock}
</head>
<body>
<h1>${title}</h1>
<p>${description}</p>
</body>
</html>`;
  }
}
