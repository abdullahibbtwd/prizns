import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import { Role } from '@prisma/client'
import { Roles } from '../auth/decorators/roles.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { BadgesService } from './badges.service'
import { AwardBadgeDto } from './dto/award-badge.dto'

@Controller('cms/badges')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.EDITOR)
export class BadgesCmsController {
  constructor(private readonly badges: BadgesService) {}

  @Get()
  list() {
    return this.badges.listCmsBadges()
  }

  @Post('award')
  @HttpCode(200)
  @Roles(Role.ADMIN)
  award(@Body() body: AwardBadgeDto) {
    return this.badges.awardManual(body.authorId, body.badgeId)
  }

  @Delete(':badgeId/authors/:authorId')
  @HttpCode(200)
  @Roles(Role.ADMIN)
  revoke(
    @Param('badgeId') badgeId: string,
    @Param('authorId') authorId: string,
  ) {
    return this.badges.revoke(authorId, badgeId)
  }

  @Post('evaluate/:authorId')
  @HttpCode(200)
  evaluate(@Param('authorId') authorId: string) {
    return this.badges.evaluateAuthor(authorId)
  }
}
