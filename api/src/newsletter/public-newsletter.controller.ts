import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';
import { NewsletterService } from './newsletter.service';

@Controller('newsletter')
export class PublicNewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  @Post('subscribe')
  subscribe(@Body() dto: SubscribeNewsletterDto, @Req() req: Request) {
    return this.newsletter.subscribe(dto, { ip: req.ip });
  }
}
