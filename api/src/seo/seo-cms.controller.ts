import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SEO_ROLES } from '../auth/role-access';
import { SeoService } from './seo.service';

@Controller('cms/seo')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SEO_ROLES)
export class SeoCmsController {
  constructor(private readonly seo: SeoService) {}

  @Get('overview')
  overview() {
    return this.seo.cmsOverview();
  }
}
