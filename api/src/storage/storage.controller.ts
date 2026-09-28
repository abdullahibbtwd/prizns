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
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { STAFF_ROLES } from '../auth/role-access';
import { StorageService } from './storage.service';

@Controller('storage')
@UseGuards(JwtAuthGuard, RolesGuard)
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
  @Roles(...STAFF_ROLES)
  async remove(@Query('key') key: string) {
    await this.storage.remove(key);
    return { ok: true };
  }
}
