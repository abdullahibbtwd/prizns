import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PublicSeriesController } from './public-series.controller';
import { SeriesService } from './series.service';

describe('PublicSeriesController', () => {
  let controller: PublicSeriesController;
  const series = { listPublic: jest.fn(), getPublicBySlug: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PublicSeriesController],
      providers: [{ provide: SeriesService, useValue: series }],
    }).compile();
    controller = module.get(PublicSeriesController);
  });

  it('lists public series', () => {
    controller.list();
    expect(series.listPublic).toHaveBeenCalled();
  });

  it('throws when slug missing', async () => {
    series.getPublicBySlug.mockResolvedValue(null);
    await expect(controller.getBySlug('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
