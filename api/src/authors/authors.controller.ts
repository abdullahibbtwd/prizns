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
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { STAFF_ROLES, SUPER_ADMIN_ROLES } from '../auth/role-access';
import { TranslationService } from '../translation/translation.service';
import { AuthorsService } from './authors.service';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';

@Controller('cms/authors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthorsController {
  constructor(
    private readonly authors: AuthorsService,
    private readonly translation: TranslationService,
  ) {}

  @Get()
  list(@Query('all') all?: string, @Query('guest') guest?: string) {
    if (all === '1' || all === 'true') {
      return this.authors.listCms({
        guest: guest === 'true' ? true : guest === 'false' ? false : undefined,
      });
    }
    return this.authors.listActive();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.authors.getById(id);
  }

  @Post()
  @Roles(...STAFF_ROLES)
  async create(@Body() dto: CreateAuthorDto) {
    const author = await this.authors.create(dto);
    if (author.translationStatus === 'PENDING') {
      await this.translation.enqueueAuthor(author.id);
    }
    return author;
  }

  @Patch(':id')
  @Roles(...STAFF_ROLES)
  async update(@Param('id') id: string, @Body() dto: UpdateAuthorDto) {
    const author = await this.authors.update(id, dto);
    if (author.translationStatus === 'PENDING') {
      await this.translation.enqueueAuthor(author.id);
    }
    return author;
  }

  @Delete(':id')
  @Roles(...SUPER_ADMIN_ROLES)
  remove(@Param('id') id: string) {
    return this.authors.remove(id);
  }
}
