import { Body, Controller, Post, Req } from '@nestjs/common'
import type { Request } from 'express'
import { AiService } from './ai.service'
import { RegionalContextDto } from './dto/regional-context.dto'

@Controller('ai')
export class PublicAiController {
  constructor(private readonly ai: AiService) {}

  @Post('regional-context')
  regionalContext(@Body() dto: RegionalContextDto, @Req() req: Request) {
    const ip =
      (typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
        : undefined) ||
      req.ip ||
      'unknown'
    this.ai.assertRateLimit(`regional-context:${ip}`)
    return this.ai.explainRegionalContext(dto)
  }
}
