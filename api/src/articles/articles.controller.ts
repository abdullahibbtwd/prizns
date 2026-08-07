import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ArticleStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { TranslationService } from '../translation/translation.service';

@Controller()
export class ArticlesController {
  constructor(
    private readonly articles: ArticlesService,
    private readonly translation: TranslationService,
  ) {}

  @Get('articles')
  listPublic(
    @Query('section') section?: string,
    @Query('series') series?: string,
  ) {
    return this.articles.listPublic(section, series);
  }

  @Get('articles/:section/:slug')
  getPublic(
    @Param('section') section: string,
    @Param('slug') slug: string,
  ) {
    return this.articles.getPublicBySectionSlug(section, slug);
  }

  @Get('cms/articles')
  @UseGuards(JwtAuthGuard)
  listCms(
    @Query('section') section?: string,
    @Query('status') status?: ArticleStatus,
    @Query('q') q?: string,
    @Query('sponsored') sponsored?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.articles.listCms({
      section,
      status,
      q,
      sponsored:
        sponsored === 'true' || sponsored === '1'
          ? true
          : sponsored === 'false' || sponsored === '0'
            ? false
            : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('cms/articles/:id')
  @UseGuards(JwtAuthGuard)
  getCms(@Param('id') id: string) {
    return this.articles.getCmsById(id);
  }

  @Post('cms/articles')
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateArticleDto) {
    const article = await this.articles.create(dto);
    if (article.translationStatus === 'PENDING') {
      await this.translation.enqueue(article.id);
    }
    return article;
  }

  @Patch('cms/articles/:id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    const article = await this.articles.update(id, dto);
    if (article.translationStatus === 'PENDING') {
      await this.translation.enqueue(article.id);
    }
    return article;
  }

  @Post('cms/articles/:id/translate')
  @UseGuards(JwtAuthGuard)
  async translate(@Param('id') id: string) {
    await this.translation.enqueue(id);
    return { ok: true, queued: true };
  }

  @Delete('cms/articles/:id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.articles.remove(id);
  }
}
