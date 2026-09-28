import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaKind } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { STAFF_ROLES } from '../auth/role-access';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUserPayload } from '../auth/auth.types';
import { GalleryVisibilityDto } from './dto/gallery-visibility.dto';
import { MediaService } from './media.service';
import { MulterExceptionFilter } from './multer-exception.filter';
import { cmsMulterOptions } from './upload-temp';

@Controller('cms/media')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  list(
    @Query('kind') kind?: string,
    @Query('q') q?: string,
    @Query('gallery') gallery?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.media.list({
      kind: this.parseKind(kind),
      q,
      showInGallery:
        gallery === 'shown' ? true : gallery === 'hidden' ? false : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Patch('gallery-visibility')
  @Roles(...STAFF_ROLES)
  setGalleryVisibility(@Body() dto: GalleryVisibilityDto) {
    return this.media.setGalleryVisibility(dto.ids, dto.showInGallery);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.media.getById(id);
  }

  @Post('upload')
  @UseFilters(MulterExceptionFilter)
  @UseInterceptors(FileInterceptor('file', cmsMulterOptions))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUserPayload,
    @Body('titleBg') titleBg?: string,
    @Body('locationBg') locationBg?: string,
    @Body('creditBg') creditBg?: string,
    @Body('folder') folder?: string,
    @Body('showInGallery') showInGallery?: string,
    @Query('creditBg') creditBgQuery?: string,
    @Query('folder') folderQuery?: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.media.createFromUpload(file, {
      titleBg,
      locationBg,
      creditBg: creditBg ?? creditBgQuery,
      folder: folder ?? folderQuery ?? 'cms',
      showInGallery: showInGallery === 'true',
      uploadedById: user?.id,
    });
  }

  @Delete(':id')
  @Roles(...STAFF_ROLES)
  remove(@Param('id') id: string) {
    return this.media.remove(id);
  }

  private parseKind(kind?: string): MediaKind | undefined {
    if (!kind) return undefined;
    const upper = kind.toUpperCase();
    if (upper === 'IMAGE' || upper === 'VIDEO' || upper === 'AUDIO') {
      return upper as MediaKind;
    }
    return undefined;
  }
}
