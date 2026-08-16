import { Body, Controller, Post, Req } from '@nestjs/common'
import type { Request } from 'express'
import { AiService } from './ai.service'
import { AskArchiveDto } from './dto/ask-archive.dto'

@Controller('archive')
export class ArchiveController {
  constructor(private readonly ai: AiService) {}

  @Post('ask')
  ask(@Body() dto: AskArchiveDto, @Req() req: Request) {
    const ip =
      (typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
        : undefined) ||
      req.ip ||
      'unknown'
    this.ai.assertRateLimit(`archive-ask:${ip}`, 8, 60_000)
    return this.ai.askArchive(dto)
  }
}
