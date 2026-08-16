import { Test, TestingModule } from '@nestjs/testing';
import { ReaderController } from './reader.controller';
import { ReaderService } from './reader.service';
import { ReaderAuthService } from '../reader-auth/reader-auth.service';
import { ReaderJwtAuthGuard } from '../reader-auth/guards/reader-jwt-auth.guard';
import { overrideGuards } from '../../test/helpers/guards';

describe('ReaderController', () => {
  let controller: ReaderController;
  const readerService = {
    listSaves: jest.fn(),
    isSaved: jest.fn(),
    saveArticle: jest.fn(),
    unsaveArticle: jest.fn(),
  };
  const readerAuth = { me: jest.fn() };
  const reader = {
    id: 'reader-1',
    email: 'reader@example.com',
    name: null,
    locale: 'bg',
  };

  beforeEach(async () => {
    readerAuth.me.mockResolvedValue(reader);
    const builder = Test.createTestingModule({
      controllers: [ReaderController],
      providers: [
        { provide: ReaderService, useValue: readerService },
        { provide: ReaderAuthService, useValue: readerAuth },
      ],
    });
    overrideGuards(builder, ReaderJwtAuthGuard);
    const module = await builder.compile();
    controller = module.get(ReaderController);
  });

  it('returns reader profile', async () => {
    await expect(controller.me(reader)).resolves.toEqual({ reader });
    expect(readerAuth.me).toHaveBeenCalledWith(reader.id);
  });

  it('lists saved articles', () => {
    controller.listSaves(reader);
    expect(readerService.listSaves).toHaveBeenCalledWith(reader.id);
  });

  it('saves article', () => {
    controller.save(reader, { articleId: 'art-1' });
    expect(readerService.saveArticle).toHaveBeenCalledWith(
      reader.id,
      'art-1',
    );
  });
});
