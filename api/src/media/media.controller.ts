import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MediaKind } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MediaService } from './media.service';

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

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      // Videos/audio on VPS can be large; images stay well under this.
      limits: { fileSize: 200 * 1024 * 1024 },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
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
    });
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
