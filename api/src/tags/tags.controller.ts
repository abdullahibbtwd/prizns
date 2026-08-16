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
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateTagDto) {
    return this.tags.create(dto);
  }

  @Patch('cms/tags/:id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateTagDto) {
    return this.tags.update(id, dto);
  }

  @Post('cms/tags/:id/geocode')
  @UseGuards(JwtAuthGuard)
  geocode(@Param('id') id: string) {
    return this.tags.geocodeTag(id);
  }

  @Delete('cms/tags/:id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.tags.remove(id);
  }
}
