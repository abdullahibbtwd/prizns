import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { MailModule } from '../mail/mail.module'
import { DigestController } from './digest.controller'
import { DigestService } from './digest.service'

@Module({
  imports: [AuthModule, MailModule],
  controllers: [DigestController],
  providers: [DigestService],
  exports: [DigestService],
})
export class DigestModule {}
