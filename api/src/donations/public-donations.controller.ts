import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { DonationsService } from './donations.service';

@Controller('donations')
export class PublicDonationsController {
  constructor(private readonly donations: DonationsService) {}

  @Post('checkout')
  checkout(@Body() dto: CreateCheckoutDto) {
    return this.donations.createCheckout(dto);
  }

  @Post('webhook')
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException(
        'Raw body unavailable. Ensure Nest is started with rawBody: true.',
      );
    }
    return this.donations.handleWebhook(rawBody, signature);
  }
}
