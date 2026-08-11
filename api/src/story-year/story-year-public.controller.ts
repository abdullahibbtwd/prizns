import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import type { Request } from 'express'
import { CurrentReader } from '../reader-auth/decorators/current-reader.decorator'
import { ReaderJwtAuthGuard } from '../reader-auth/guards/reader-jwt-auth.guard'
import { ReaderAuthService } from '../reader-auth/reader-auth.service'
import { READER_AUTH_COOKIES } from '../reader-auth/reader-auth.types'
import type { ReaderPayload } from '../reader-auth/reader-auth.types'
import { CastStoryYearVoteDto } from './dto/story-year.dto'
import { StoryYearService } from './story-year.service'

@Controller('story-of-the-year')
export class StoryYearPublicController {
  constructor(
    private readonly storyYear: StoryYearService,
    private readonly readerAuth: ReaderAuthService,
  ) {}

  @Get()
  async current(@Req() req: Request) {
    const access = req.cookies?.[READER_AUTH_COOKIES.access] as
      | string
      | undefined
    const readerId = await this.readerAuth.peekReaderId(access)
    return this.storyYear.getPublicCurrent(readerId)
  }

  @Post('vote')
  @HttpCode(200)
  @UseGuards(ReaderJwtAuthGuard)
  vote(
    @CurrentReader() reader: ReaderPayload,
    @Body() dto: CastStoryYearVoteDto,
  ) {
    return this.storyYear.castVote(reader.id, dto.articleId)
  }
}
