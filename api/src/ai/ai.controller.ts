import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AiService } from './ai.service'
import { AiSuggestDto } from './dto/suggest.dto'

@Controller('cms/ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('suggest')
  suggest(@Body() dto: AiSuggestDto) {
    return this.ai.suggest(dto)
  }
}
