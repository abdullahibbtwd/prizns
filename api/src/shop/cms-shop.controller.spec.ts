import { Test, TestingModule } from '@nestjs/testing';
import { CmsShopController } from './cms-shop.controller';
import { ShopService } from './shop.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { overrideGuards } from '../../test/helpers/guards';

describe('CmsShopController', () => {
  let controller: CmsShopController;
  const shop = {
    listCmsProducts: jest.fn(),
    getCmsProduct: jest.fn(),
    createProduct: jest.fn(),
    updateProduct: jest.fn(),
    listCmsOrders: jest.fn(),
    getCmsOrder: jest.fn(),
    markShipped: jest.fn(),
  };

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [CmsShopController],
      providers: [{ provide: ShopService, useValue: shop }],
    });
    overrideGuards(builder, JwtAuthGuard, RolesGuard);
    const module = await builder.compile();
    controller = module.get(CmsShopController);
  });

  it('lists cms products', () => {
    controller.listProducts();
    expect(shop.listCmsProducts).toHaveBeenCalled();
  });

  it('lists cms orders with parsed status', () => {
    controller.listOrders('1', '20', 'PAID');
    expect(shop.listCmsOrders).toHaveBeenCalled();
  });

  it('marks order shipped', () => {
    controller.ship('order-1');
    expect(shop.markShipped).toHaveBeenCalledWith('order-1');
  });
});
