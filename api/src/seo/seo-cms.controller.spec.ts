import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { overrideGuards } from '../../test/helpers/guards';
import { SeoCmsController } from './seo-cms.controller';
import { SeoService } from './seo.service';

describe('SeoCmsController', () => {
  let controller: SeoCmsController;
  const seo = { cmsOverview: jest.fn() };

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [SeoCmsController],
      providers: [{ provide: SeoService, useValue: seo }],
    });
    overrideGuards(builder, JwtAuthGuard);
    const module = await builder.compile();
    controller = module.get(SeoCmsController);
  });

  it('returns the CMS SEO overview', async () => {
    seo.cmsOverview.mockResolvedValue({ published: 3, coveragePct: 67 });
    await expect(controller.overview()).resolves.toEqual({
      published: 3,
      coveragePct: 67,
    });
    expect(seo.cmsOverview).toHaveBeenCalled();
  });
});
