import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { overrideGuards } from '../../test/helpers/guards';

describe('MediaController', () => {
  let controller: MediaController;
  const media = { list: jest.fn(), createFromUpload: jest.fn() };

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [MediaController],
      providers: [{ provide: MediaService, useValue: media }],
    });
    overrideGuards(builder, JwtAuthGuard);
    const module = await builder.compile();
    controller = module.get(MediaController);
  });

  it('lists media with parsed kind', () => {
    controller.list('image');
    expect(media.list).toHaveBeenCalledWith({ kind: 'IMAGE' });
  });

  it('requires file on upload', () => {
    expect(() => controller.upload(undefined as never)).toThrow(
      BadRequestException,
    );
  });

  it('uploads file via media service', () => {
    const file = { originalname: 'a.jpg' } as Express.Multer.File;
    controller.upload(file, 'Title', 'Vidin', 'Credit');
    expect(media.createFromUpload).toHaveBeenCalledWith(
      file,
      expect.objectContaining({ titleBg: 'Title', folder: 'cms' }),
    );
  });
});
