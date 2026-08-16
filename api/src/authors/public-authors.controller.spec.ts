import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PublicAuthorsController } from './public-authors.controller';
import { AuthorsService } from './authors.service';

describe('PublicAuthorsController', () => {
  let controller: PublicAuthorsController;
  const authors = {
    listPublic: jest.fn(),
    getPublicBySlug: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PublicAuthorsController],
      providers: [{ provide: AuthorsService, useValue: authors }],
    }).compile();
    controller = module.get(PublicAuthorsController);
  });

  it('lists public authors', () => {
    controller.list();
    expect(authors.listPublic).toHaveBeenCalled();
  });

  it('throws when slug not found', async () => {
    authors.getPublicBySlug.mockResolvedValue(null);
    await expect(controller.getBySlug('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
