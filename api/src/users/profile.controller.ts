import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUserPayload } from '../auth/auth.types';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TranslationService } from '../translation/translation.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@Controller('cms/profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(
    private readonly users: UsersService,
    private readonly auth: AuthService,
    private readonly translation: TranslationService,
  ) {}

  @Get()
  get(@CurrentUser() actor: AuthUserPayload) {
    return this.users.getProfile(actor.id);
  }

  @Patch()
  async update(
    @CurrentUser() actor: AuthUserPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    const { profile, authorUpdated } = await this.users.updateProfile(
      actor.id,
      dto,
    );
    if (authorUpdated && profile.authorId) {
      await this.translation.enqueueAuthor(profile.authorId);
    }
    return profile;
  }

  @Post('logout-others')
  logoutOthers(@CurrentUser() actor: AuthUserPayload) {
    if (!actor.sessionId) {
      return { revoked: 0 };
    }
    return this.auth.logoutOtherSessions(actor.id, actor.sessionId);
  }
}
