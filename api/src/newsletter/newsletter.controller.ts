import {
  Controller,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { STAFF_ROLES } from '../auth/role-access';
import { NewsletterService } from './newsletter.service';

@Controller('cms/newsletter')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...STAFF_ROLES)
export class NewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  @Get('subscribers')
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('q') q?: string,
  ) {
    return this.newsletter.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      q,
    });
  }

  @Get('count')
  count() {
    return this.newsletter.count();
  }

  @Delete('subscribers/:id')
  remove(@Param('id') id: string) {
    return this.newsletter.remove(id);
  }
}
