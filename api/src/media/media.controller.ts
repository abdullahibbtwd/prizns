import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUserPayload } from '../auth/auth.types';
import { MediaService } from './media.service';
import { MulterExceptionFilter } from './multer-exception.filter';
import { cmsMulterOptions } from './upload-temp';

@Controller('cms/media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  list(@Query('kind') kind?: string) {
    return this.media.list({
      kind: this.parseKind(kind),
    });
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
      uploadedById: user?.id,
    });
  }

  @Delete(':id')
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
