import {
  Controller,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NewsletterService } from './newsletter.service';

@Controller('cms/newsletter')
@UseGuards(JwtAuthGuard)
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
