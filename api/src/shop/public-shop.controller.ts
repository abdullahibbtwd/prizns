import { Body, Controller, Get, Headers, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  CreateCodOrderDto,
  CreateShopCheckoutDto,
  TrackOrderDto,
} from './dto/shop.dto';
import { ShopService } from './shop.service';

@Controller('shop')
export class PublicShopController {
  constructor(private readonly shop: ShopService) {}

  @Get('products')
  listProducts() {
    return this.shop.listPublicProducts();
  }

  @Get('products/:slug')
  getProduct(@Param('slug') slug: string) {
    return this.shop.getPublicProduct(slug);
  }

  @Post('checkout')
  checkout(
    @Body() dto: CreateShopCheckoutDto,
    @Req() req: Request,
    @Headers('x-forwarded-for') forwarded?: string,
  ) {
    const ip =
      forwarded?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      'anon';
    return this.shop.createCheckout(dto, ip);
  }

  @Post('checkout/cod')
  checkoutCod(
    @Body() dto: CreateCodOrderDto,
    @Req() req: Request,
    @Headers('x-forwarded-for') forwarded?: string,
  ) {
    const ip =
      forwarded?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      'anon';
    return this.shop.createCodOrder(dto, ip);
  }

  @Post('orders/track')
  track(
    @Body() dto: TrackOrderDto,
    @Req() req: Request,
    @Headers('x-forwarded-for') forwarded?: string,
  ) {
    const ip =
      forwarded?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      'anon';
    return this.shop.trackOrder(dto, ip);
  }

  @Post('orders/delivered')
  delivered(
    @Body() dto: TrackOrderDto,
    @Req() req: Request,
    @Headers('x-forwarded-for') forwarded?: string,
  ) {
    const ip =
      forwarded?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      'anon';
    return this.shop.markDelivered(dto, ip);
  }
}
