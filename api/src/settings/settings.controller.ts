import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthUserPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MailService } from '../mail/mail.service';
import {
  TestEmailDto,
  UpdateSiteSettingsDto,
} from './dto/update-site-settings.dto';
import { SettingsService } from './settings.service';

@Controller('cms/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly mail: MailService,
  ) {}

  @Get()
  async get() {
    await this.settings.reload();
    return this.settings.getCms();
  }

  @Patch()
  update(@Body() dto: UpdateSiteSettingsDto) {
    return this.settings.update(dto);
  }

  @Post('test-stripe')
  testStripe() {
    return this.settings.testStripe();
  }

  @Post('test-email')
  async testEmail(
    @Body() dto: TestEmailDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    const to = dto.to?.trim() || user.email;
    await this.mail.send({
      to,
      subject: 'Prizni · test email',
      text: 'Email sending from Prizni works. / Изпращането на имейли от Prizni работи.',
      html: '<p>Email sending from Prizni works.</p><p>Изпращането на имейли от Prizni работи.</p>',
    });
    return { ok: true as const, to, from: this.settings.mailFrom() };
  }
}

@Controller('settings')
export class PublicSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('public')
  getPublic() {
    return this.settings.getPublic();
  }
}
