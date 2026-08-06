import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { MediaController } from './media.controller';
import { PublicMediaController } from './public-media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [MediaController, PublicMediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
