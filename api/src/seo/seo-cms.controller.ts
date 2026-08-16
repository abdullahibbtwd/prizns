import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SeoService } from './seo.service';

@Controller('cms/seo')
@UseGuards(JwtAuthGuard)
export class SeoCmsController {
  constructor(private readonly seo: SeoService) {}

  @Get('overview')
  overview() {
    return this.seo.cmsOverview();
  }
}
