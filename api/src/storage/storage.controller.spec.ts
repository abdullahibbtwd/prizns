import { Test, TestingModule } from '@nestjs/testing';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { overrideGuards } from '../../test/helpers/guards';

describe('StorageController', () => {
  let controller: StorageController;
  const storage = {
    upload: jest.fn(),
    getPresignedUrl: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    storage.getPresignedUrl.mockResolvedValue('https://signed');
    const builder = Test.createTestingModule({
      controllers: [StorageController],
      providers: [{ provide: StorageService, useValue: storage }],
    });
    overrideGuards(builder, JwtAuthGuard);
    const module = await builder.compile();
    controller = module.get(StorageController);
  });

  it('uploads with folder query', () => {
    const file = {} as Express.Multer.File;
    controller.upload(file, 'media');
    expect(storage.upload).toHaveBeenCalledWith(file, 'media');
  });

  it('returns presigned url', async () => {
    await expect(controller.presign('key.jpg', '7200')).resolves.toEqual({
      url: 'https://signed',
    });
    expect(storage.getPresignedUrl).toHaveBeenCalledWith('key.jpg', 7200);
  });

  it('removes object by key', async () => {
    storage.remove.mockResolvedValue(undefined);
    await expect(controller.remove('key.jpg')).resolves.toEqual({ ok: true });
  });
});
