import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { STORY_WRITER_ROLES } from '../auth/role-access'
import { AiService } from './ai.service'
import { AiSuggestDto } from './dto/suggest.dto'

@Controller('cms/ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...STORY_WRITER_ROLES)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('suggest')
  suggest(@Body() dto: AiSuggestDto) {
    return this.ai.suggest(dto)
  }
}
