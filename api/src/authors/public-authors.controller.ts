import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ArticleStatus } from '@prisma/client';
import { AuthorsService } from './authors.service';

@Controller('authors')
export class PublicAuthorsController {
  constructor(private readonly authors: AuthorsService) {}

  @Get()
  list() {
    return this.authors.listPublic();
  }

  @Get(':slug')
  async getBySlug(@Param('slug') slug: string) {
    const author = await this.authors.getPublicBySlug(slug);
    if (!author) throw new NotFoundException('Author not found');
    return author;
  }
}
