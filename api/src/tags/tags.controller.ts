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
import { STORY_WRITER_ROLES, SEO_ROLES } from '../auth/role-access';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagsService } from './tags.service';

@Controller()
export class TagsController {
  constructor(private readonly tags: TagsService) {}

  @Get('places/map')
  listMap() {
    return this.tags.listMapPins();
  }

  @Get('tags')
  listPublic(@Query('kind') kind?: string) {
    return this.tags.listPublic(kind);
  }

  @Get('cms/tags')
  @UseGuards(JwtAuthGuard)
  listCms(@Query('kind') kind?: string) {
    return this.tags.listCms(kind);
  }

  @Get('cms/tags/:id')
  @UseGuards(JwtAuthGuard)
  get(@Param('id') id: string) {
    return this.tags.getById(id);
  }

  @Post('cms/tags')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STORY_WRITER_ROLES)
  create(@Body() dto: CreateTagDto) {
    return this.tags.create(dto);
  }

  @Patch('cms/tags/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...SEO_ROLES)
  update(@Param('id') id: string, @Body() dto: UpdateTagDto) {
    return this.tags.update(id, dto);
  }

  @Post('cms/tags/:id/geocode')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...SEO_ROLES)
  geocode(@Param('id') id: string) {
    return this.tags.geocodeTag(id);
  }

  @Delete('cms/tags/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...SEO_ROLES)
  remove(@Param('id') id: string) {
    return this.tags.remove(id);
  }
}
