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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TranslationService } from '../translation/translation.service';
import { AuthorsService } from './authors.service';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';

@Controller('cms/authors')
@UseGuards(JwtAuthGuard)
export class AuthorsController {
  constructor(
    private readonly authors: AuthorsService,
    private readonly translation: TranslationService,
  ) {}

  @Get()
  list(@Query('all') all?: string) {
    if (all === '1' || all === 'true') return this.authors.listCms();
    return this.authors.listActive();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.authors.getById(id);
  }

  @Post()
  async create(@Body() dto: CreateAuthorDto) {
    const author = await this.authors.create(dto);
    if (author.translationStatus === 'PENDING') {
      await this.translation.enqueueAuthor(author.id);
    }
    return author;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAuthorDto) {
    const author = await this.authors.update(id, dto);
    if (author.translationStatus === 'PENDING') {
      await this.translation.enqueueAuthor(author.id);
    }
    return author;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.authors.remove(id);
  }
}
