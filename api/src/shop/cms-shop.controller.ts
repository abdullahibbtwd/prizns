import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ShopOrderStatus } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { STAFF_ROLES } from '../auth/role-access';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateProductDto, UpdateProductDto } from './dto/shop.dto';
import { ShopService } from './shop.service';

@Controller('cms/shop')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CmsShopController {
  constructor(private readonly shop: ShopService) {}

  @Get('products')
  @Roles(...STAFF_ROLES)
  listProducts() {
    return this.shop.listCmsProducts();
  }

  @Get('products/:id')
  @Roles(...STAFF_ROLES)
  getProduct(@Param('id') id: string) {
    return this.shop.getCmsProduct(id);
  }

  @Post('products')
  @Roles('ADMIN')
  createProduct(@Body() dto: CreateProductDto) {
    return this.shop.createProduct(dto);
  }

  @Patch('products/:id')
  @Roles('ADMIN')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.shop.updateProduct(id, dto);
  }

  @Get('orders')
  @Roles(...STAFF_ROLES)
  listOrders(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ) {
    const normalized = status?.trim().toUpperCase();
    const parsed =
      normalized &&
      (Object.values(ShopOrderStatus) as string[]).includes(normalized)
        ? (normalized as ShopOrderStatus)
        : undefined;
    return this.shop.listCmsOrders({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status: parsed,
    });
  }

  @Get('orders/:id')
  @Roles(...STAFF_ROLES)
  getOrder(@Param('id') id: string) {
    return this.shop.getCmsOrder(id);
  }

  @Patch('orders/:id/ship')
  @Roles('ADMIN')
  ship(@Param('id') id: string) {
    return this.shop.markShipped(id);
  }
}
