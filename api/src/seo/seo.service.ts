import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ArticleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
] as const;

const SITE_NAME = 'Prizni';
const DEFAULT_DESCRIPTION =
  'Prizni — human stories, places, and traditions from Northwestern Bulgaria.';

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

  private filled(value?: string | null): boolean {
    return Boolean(value?.trim());
  }

  /** CMS desk: technical SEO is live; unique title/description is the editorial gap. */
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
        seoTitleBg: true,
        seoTitleEn: true,
        seoDescriptionBg: true,
        seoDescriptionEn: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const rows = published.map((article) => {
      const hasTitle =
        this.filled(article.seoTitleBg) || this.filled(article.seoTitleEn);
      const hasDescription =
        this.filled(article.seoDescriptionBg) ||
        this.filled(article.seoDescriptionEn);
      return {
        id: article.id,
        path: article.path.startsWith('/') ? article.path : `/${article.path}`,
        section: article.section,
        titleBg: article.titleBg,
        titleEn: article.titleEn,
        hasTitle,
        hasDescription,
      };
    });

    const missingTitle = rows.filter((row) => !row.hasTitle).length;
    const missingDescription = rows.filter((row) => !row.hasDescription).length;
    const withUniqueMeta = rows.filter(
      (row) => row.hasTitle && row.hasDescription,
    ).length;
    const coveragePct =
      rows.length === 0 ? 100 : Math.round((withUniqueMeta / rows.length) * 100);

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
        .filter((row) => !row.hasTitle || !row.hasDescription)
        .slice(0, 50),
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
      if (!decoded.startsWith('/')) return `/${decoded}`;
      return decoded.split('?')[0] || '/';
    } catch {
      return trimmed.startsWith('/') ? trimmed.split('?')[0] : `/${trimmed}`;
    }
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

  async botShellHtml(rawPath?: string): Promise<string> {
    const base = this.siteUrl();
    const path = this.normalizePath(rawPath);
    const canonical = `${base}${path === '/' ? '' : path}`;

    const article = await this.prisma.article.findFirst({
      where: {
        status: ArticleStatus.PUBLISHED,
        path,
      },
      include: {
        heroMedia: true,
        author: true,
      },
    });

    if (article) {
      const title =
        article.seoTitleEn ??
        article.seoTitleBg ??
        article.titleEn ??
        article.titleBg;
      const description =
        article.seoDescriptionEn ??
        article.seoDescriptionBg ??
        article.subtitleEn ??
        article.subtitleBg ??
        DEFAULT_DESCRIPTION;
      const image = article.heroMedia?.url?.trim() || `${base}/og-default.png`;
      const authorName =
        article.author?.nameEn ?? article.author?.nameBg ?? undefined;
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

      return this.renderHtml({
        title: `${title} | ${SITE_NAME}`,
        description,
        canonical,
        image,
        type: 'article',
        jsonLd,
      });
    }

    return this.renderHtml({
      title: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      canonical,
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
    });
  }

  private renderHtml(meta: {
    title: string;
    description: string;
    canonical: string;
    image: string;
    type: 'article' | 'website';
    jsonLd?: Record<string, unknown>;
  }): string {
    const title = this.escapeHtml(meta.title);
    const description = this.escapeHtml(meta.description);
    const canonical = this.escapeHtml(meta.canonical);
    const image = this.escapeHtml(meta.image);
    const imageType = meta.image.toLowerCase().includes('.png')
      ? 'image/png'
      : 'image/jpeg';
    const jsonLdBlock = meta.jsonLd
      ? `<script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>`
      : '';

    return `<!DOCTYPE html>
<html lang="bg">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<meta name="description" content="${description}" />
<link rel="canonical" href="${canonical}" />
<meta property="og:site_name" content="${SITE_NAME}" />
<meta property="og:type" content="${meta.type}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:image" content="${image}" />
<meta property="og:image:alt" content="${title}" />
<meta property="og:image:type" content="${imageType}" />
<meta property="og:locale" content="bg_BG" />
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
