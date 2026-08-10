import { Body, Controller, Post } from '@nestjs/common';
import { CreatePartnershipDto } from './dto/create-partnership.dto';
import { PartnershipsService } from './partnerships.service';

@Controller('partnerships')
export class PublicPartnershipsController {
  constructor(private readonly partnerships: PartnershipsService) {}

  @Post()
  create(@Body() dto: CreatePartnershipDto) {
    return this.partnerships.create(dto);
  }
}
