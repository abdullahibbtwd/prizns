import { Module } from '@nestjs/common'
import { AiModule } from '../ai/ai.module'
import { AuthModule } from '../auth/auth.module'
import { MailModule } from '../mail/mail.module'
import { ContactController } from './contact.controller'
import { ContactService } from './contact.service'
import { PublicContactController } from './public-contact.controller'

@Module({
  imports: [AuthModule, AiModule, MailModule],
  controllers: [PublicContactController, ContactController],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactModule {}
