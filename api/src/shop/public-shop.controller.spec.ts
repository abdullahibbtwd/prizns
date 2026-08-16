import { Test, TestingModule } from '@nestjs/testing';
import { PublicShopController } from './public-shop.controller';
import { ShopService } from './shop.service';

describe('PublicShopController', () => {
  let controller: PublicShopController;
  const shop = {
    listPublicProducts: jest.fn(),
    getPublicProduct: jest.fn(),
    createCheckout: jest.fn(),
    createCodOrder: jest.fn(),
    trackOrder: jest.fn(),
    markDelivered: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PublicShopController],
      providers: [{ provide: ShopService, useValue: shop }],
    }).compile();
    controller = module.get(PublicShopController);
  });

  it('lists public products', () => {
    controller.listProducts();
    expect(shop.listPublicProducts).toHaveBeenCalled();
  });

  it('creates checkout with client ip', () => {
    const dto = { productSlug: 'journal' } as never;
    const req = { ip: '127.0.0.1', socket: {} } as never;
    controller.checkout(dto, req);
    expect(shop.createCheckout).toHaveBeenCalledWith(dto, '127.0.0.1');
  });

  it('tracks order with forwarded ip', () => {
    const dto = { publicId: 'ORD-1', email: 'a@example.com' } as never;
    const req = { ip: '127.0.0.1', socket: {} } as never;
    controller.track(dto, req, '203.0.113.1, 127.0.0.1');
    expect(shop.trackOrder).toHaveBeenCalledWith(dto, '203.0.113.1');
  });
});
