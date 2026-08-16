import { Test, TestingModule } from '@nestjs/testing';
import { SeriesController } from './series.controller';
import { SeriesService } from './series.service';
import { TranslationService } from '../translation/translation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { overrideGuards } from '../../test/helpers/guards';

describe('SeriesController', () => {
  let controller: SeriesController;
  const series = {
    list: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    setEpisodes: jest.fn(),
    remove: jest.fn(),
  };
  const translation = { enqueueSeries: jest.fn() };

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [SeriesController],
      providers: [
        { provide: SeriesService, useValue: series },
        { provide: TranslationService, useValue: translation },
      ],
    });
    overrideGuards(builder, JwtAuthGuard);
    const module = await builder.compile();
    controller = module.get(SeriesController);
  });

  it('lists series', () => {
    controller.list();
    expect(series.list).toHaveBeenCalled();
  });

  it('queues translation after create when pending', async () => {
    series.create.mockResolvedValue({ id: 's1', translationStatus: 'PENDING' });
    await controller.create({ titleBg: 'Series' } as never);
    expect(translation.enqueueSeries).toHaveBeenCalledWith('s1');
  });

  it('deletes a series', async () => {
    series.remove.mockResolvedValue({ ok: true, id: 's1' });
    await expect(controller.remove('s1')).resolves.toEqual({
      ok: true,
      id: 's1',
    });
  });
});
