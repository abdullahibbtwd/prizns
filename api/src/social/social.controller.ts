import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { STAFF_ROLES } from '../auth/role-access'
import {
  GenerateSocialDto,
  UpdateSocialPlatformsDto,
  UpdateSocialPostDto,
} from './dto/social.dto'
import { SocialService } from './social.service'

@Controller('cms/social')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...STAFF_ROLES)
export class SocialController {
  constructor(private readonly social: SocialService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('articleId') articleId?: string,
  ) {
    return this.social.list({ status, articleId })
  }

  @Get('platforms')
  platforms() {
    return this.social.getPlatformSettings()
  }

  @Put('platforms')
  savePlatforms(@Body() dto: UpdateSocialPlatformsDto) {
    return this.social.savePlatformSettings(dto)
  }

  @Post('generate')
  generate(@Body() dto: GenerateSocialDto) {
    return this.social.generate(dto)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSocialPostDto) {
    return this.social.update(id, dto)
  }

  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.social.approve(id)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.social.remove(id)
  }
}
