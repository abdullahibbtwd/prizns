import { Controller, Get, Query } from '@nestjs/common';
import { MediaKind } from '@prisma/client';
import { MediaService } from './media.service';

@Controller()
export class PublicMediaController {
  constructor(private readonly media: MediaService) {}

  /** Public gallery feed — images from the CMS media library. */
  @Get('media')
  list(@Query('kind') kind?: string) {
    const parsed =
      kind?.toUpperCase() === 'VIDEO'
        ? MediaKind.VIDEO
        : kind?.toUpperCase() === 'AUDIO'
          ? MediaKind.AUDIO
          : MediaKind.IMAGE;
    return this.media.listPublic({ kind: parsed });
  }
}
