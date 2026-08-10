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
import { CreateReactionDto } from './dto/create-reaction.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { TranslationService } from '../translation/translation.service';
import { TtsService } from '../tts/tts.service';

@Controller()
export class ArticlesController {
  constructor(
    private readonly articles: ArticlesService,
    private readonly translation: TranslationService,
    private readonly tts: TtsService,
  ) {}

  @Get('articles')
  listPublic(
    @Query('section') section?: string,
    @Query('series') series?: string,
    @Query('location') location?: string,
    @Query('topic') topic?: string,
    @Query('category') category?: string,
    @Query('hasAudio') hasAudio?: string,
  ) {
    return this.articles.listPublic(section, series, {
      location,
      topic,
      category,
      hasAudio:
        hasAudio === 'true' || hasAudio === '1'
          ? true
          : hasAudio === 'false' || hasAudio === '0'
            ? false
            : undefined,
    });
  }

  @Get('articles/:section/:slug/related')
  listRelated(
    @Param('section') section: string,
    @Param('slug') slug: string,
    @Query('limit') limit?: string,
  ) {
    return this.articles.listRelated(
      section,
      slug,
      limit ? Number(limit) : 3,
    );
  }

  @Post('articles/:section/:slug/reactions')
  addRelate(
    @Param('section') section: string,
    @Param('slug') slug: string,
    @Body() dto: CreateReactionDto,
  ) {
    return this.articles.addRelate(
      section,
      slug,
      dto.visitorKey,
    );
  }

  @Get('articles/:section/:slug')
  getPublic(
    @Param('section') section: string,
    @Param('slug') slug: string,
    @Query('visitorKey') visitorKey?: string,
  ) {
    return this.articles.getPublicBySectionSlug(section, slug, visitorKey);
  }

  @Get('cms/articles')
  @UseGuards(JwtAuthGuard)
  listCms(
    @Query('section') section?: string,
    @Query('status') status?: ArticleStatus,
    @Query('authorId') authorId?: string,
    @Query('q') q?: string,
    @Query('sponsored') sponsored?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.articles.listCms({
      section,
      status,
      authorId,
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

  @Post('cms/articles/:id/narrate')
  @UseGuards(JwtAuthGuard)
  narrate(@Param('id') id: string) {
    return this.tts.enqueue(id);
  }

  @Delete('cms/articles/:id/narration')
  @UseGuards(JwtAuthGuard)
  clearNarration(@Param('id') id: string) {
    return this.tts.clearNarration(id);
  }

  @Delete('cms/articles/:id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.articles.remove(id);
  }
}
