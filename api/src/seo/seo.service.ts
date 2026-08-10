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

  robotsTxt(): string {
    const base = this.siteUrl();
    return [
      'User-agent: *',
      'Allow: /',
      `Sitemap: ${base}/sitemap.xml`,
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
      const image = article.heroMedia?.url?.trim() || `${base}/og-default.jpg`;
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
      image: `${base}/og-default.jpg`,
      type: 'website',
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
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${image}" />
${jsonLdBlock}
</head>
<body>
<h1>${title}</h1>
<p>${description}</p>
</body>
</html>`;
  }
}
