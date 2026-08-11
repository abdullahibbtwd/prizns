import { Module } from '@nestjs/common'
import { ReaderAuthModule } from '../reader-auth/reader-auth.module'
import { ReaderController } from './reader.controller'
import { ReaderService } from './reader.service'

@Module({
  imports: [ReaderAuthModule],
  controllers: [ReaderController],
  providers: [ReaderService],
  exports: [ReaderService],
})
export class ReaderModule {}
