import { Controller, Get, Header, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SeoService } from './seo.service';

@Controller()
export class SeoController {
  constructor(private readonly seo: SeoService) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'text/xml; charset=utf-8')
  async sitemap(@Res() res: Response) {
    const xml = await this.seo.sitemapXml();
    res.type('text/xml').send(xml);
  }

  @Get('feed.xml')
  @Header('Content-Type', 'application/rss+xml; charset=utf-8')
  async rss(@Res() res: Response) {
    const xml = await this.seo.rssXml();
    res.type('application/rss+xml').send(xml);
  }

  @Get('feed.json')
  @Header('Content-Type', 'application/feed+json; charset=utf-8')
  async jsonFeed(@Res() res: Response) {
    const json = await this.seo.jsonFeed();
    res.type('application/feed+json').send(json);
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  robots(@Res() res: Response) {
    res.type('text/plain').send(this.seo.robotsTxt());
  }

  @Get('bot-shell')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async botShell(@Query('path') path: string | undefined, @Res() res: Response) {
    const html = await this.seo.botShellHtml(path);
    res.type('text/html').send(html);
  }
}
