import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { CurrentReader } from '../reader-auth/decorators/current-reader.decorator'
import { ReaderJwtAuthGuard } from '../reader-auth/guards/reader-jwt-auth.guard'
import type { ReaderPayload } from '../reader-auth/reader-auth.types'
import { ReaderAuthService } from '../reader-auth/reader-auth.service'
import { SaveArticleDto } from './dto/save-article.dto'
import { ReaderService } from './reader.service'

@Controller('reader')
@UseGuards(ReaderJwtAuthGuard)
export class ReaderController {
  constructor(
    private readonly readerService: ReaderService,
    private readonly readerAuth: ReaderAuthService,
  ) {}

  @Get('me')
  async me(@CurrentReader() reader: ReaderPayload) {
    return { reader: await this.readerAuth.me(reader.id) }
  }

  @Get('saves')
  listSaves(@CurrentReader() reader: ReaderPayload) {
    return this.readerService.listSaves(reader.id)
  }

  @Get('saves/status')
  isSaved(
    @CurrentReader() reader: ReaderPayload,
    @Query('articleId') articleId: string,
  ) {
    return this.readerService.isSaved(reader.id, articleId)
  }

  @Post('saves')
  @HttpCode(200)
  save(
    @CurrentReader() reader: ReaderPayload,
    @Body() dto: SaveArticleDto,
  ) {
    return this.readerService.saveArticle(reader.id, dto.articleId)
  }

  @Delete('saves/:articleId')
  @HttpCode(200)
  unsave(
    @CurrentReader() reader: ReaderPayload,
    @Param('articleId') articleId: string,
  ) {
    return this.readerService.unsaveArticle(reader.id, articleId)
  }
}
