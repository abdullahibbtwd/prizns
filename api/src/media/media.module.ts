import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from '../auth/auth.module';
import { QUEUE_MEDIA } from '../jobs/queue.constants';
import { StorageModule } from '../storage/storage.module';
import { MediaController } from './media.controller';
import { PublicMediaController } from './public-media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [
    AuthModule,
    StorageModule,
    BullModule.registerQueue({ name: QUEUE_MEDIA }),
  ],
  controllers: [MediaController, PublicMediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
