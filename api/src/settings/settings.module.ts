import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import {
  PublicSettingsController,
  SettingsController,
} from './settings.controller';
import { SettingsService } from './settings.service';

@Global()
@Module({
  imports: [AuthModule, MailModule],
  controllers: [SettingsController, PublicSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
