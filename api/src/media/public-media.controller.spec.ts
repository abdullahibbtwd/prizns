import { Test, TestingModule } from '@nestjs/testing';
import { MediaKind } from '@prisma/client';
import { PublicMediaController } from './public-media.controller';
import { MediaService } from './media.service';

describe('PublicMediaController', () => {
  let controller: PublicMediaController;
  const media = { listPublic: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PublicMediaController],
      providers: [{ provide: MediaService, useValue: media }],
    }).compile();
    controller = module.get(PublicMediaController);
  });

  it('defaults to image kind', () => {
    controller.list(undefined);
    expect(media.listPublic).toHaveBeenCalledWith({ kind: MediaKind.IMAGE });
  });

  it('parses video kind', () => {
    controller.list('video');
    expect(media.listPublic).toHaveBeenCalledWith({ kind: MediaKind.VIDEO });
  });
});
