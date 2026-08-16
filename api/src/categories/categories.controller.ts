import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TranslationService } from '../translation/translation.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoriesService } from './categories.service';

@Controller()
export class CategoriesController {
  constructor(
    private readonly categories: CategoriesService,
    private readonly translation: TranslationService,
  ) {}

  @Get('categories')
  listPublic() {
    return this.categories.list();
  }

  @Get('cms/categories')
  @UseGuards(JwtAuthGuard)
  listCms() {
    return this.categories.list();
  }

  @Get('cms/categories/:id')
  @UseGuards(JwtAuthGuard)
  get(@Param('id') id: string) {
    return this.categories.getById(id);
  }

  @Post('cms/categories')
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateCategoryDto) {
    const category = await this.categories.create(dto);
    if (category.translationStatus === 'PENDING') {
      await this.translation.enqueueCategory(category.id);
    }
    return category;
  }

  @Patch('cms/categories/:id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    const category = await this.categories.update(id, dto);
    if (category.translationStatus === 'PENDING') {
      await this.translation.enqueueCategory(category.id);
    }
    return category;
  }

  @Delete('cms/categories/:id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.categories.remove(id);
  }
}
