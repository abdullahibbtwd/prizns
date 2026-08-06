import {
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StorageService } from './storage.service';

@Controller('storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    return this.storage.upload(file, folder ?? 'uploads');
  }

  @Get('presign')
  async presign(
    @Query('key') key: string,
    @Query('expiry') expiry?: string,
  ) {
    const seconds = expiry ? Number(expiry) : 3600;
    const url = await this.storage.getPresignedUrl(key, seconds);
    return { url };
  }

  @Delete()
  async remove(@Query('key') key: string) {
    await this.storage.remove(key);
    return { ok: true };
  }
}
