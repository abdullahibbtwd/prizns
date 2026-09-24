import { Test, TestingModule } from '@nestjs/testing';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';

describe('SeoController', () => {
  let controller: SeoController;
  const seo = {
    sitemapXml: jest.fn().mockResolvedValue('<urlset/>'),
    rssXml: jest.fn().mockResolvedValue('<rss/>'),
    jsonFeed: jest.fn().mockResolvedValue('{}'),
    robotsTxt: jest.fn().mockReturnValue('User-agent: *'),
    botShellHtml: jest.fn().mockResolvedValue({ html: '<html/>', status: 200 }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [SeoController],
      providers: [{ provide: SeoService, useValue: seo }],
    }).compile();
    controller = module.get(SeoController);
  });

  it('sends sitemap xml', async () => {
    const res = { type: jest.fn().mockReturnThis(), send: jest.fn() };
    await controller.sitemap(res as never);
    expect(seo.sitemapXml).toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith('<urlset/>');
  });

  it('sends robots txt', () => {
    const res = { type: jest.fn().mockReturnThis(), send: jest.fn() };
    controller.robots(res as never);
    expect(seo.robotsTxt).toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith('User-agent: *');
  });

  it('sends bot shell with status', async () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    await controller.botShell('/stories/missing', res as never);
    expect(seo.botShellHtml).toHaveBeenCalledWith('/stories/missing');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('<html/>');
  });
});
