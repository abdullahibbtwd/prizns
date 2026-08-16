import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PublicDonationsController } from './public-donations.controller';
import { DonationsService } from './donations.service';

describe('PublicDonationsController', () => {
  let controller: PublicDonationsController;
  const donations = { createCheckout: jest.fn(), handleWebhook: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PublicDonationsController],
      providers: [{ provide: DonationsService, useValue: donations }],
    }).compile();
    controller = module.get(PublicDonationsController);
  });

  it('creates checkout session', () => {
    const dto = { amountBgn: 10 };
    controller.checkout(dto);
    expect(donations.createCheckout).toHaveBeenCalledWith(dto);
  });

  it('requires raw body for webhook', () => {
    expect(() =>
      controller.webhook({ rawBody: undefined } as never, 'sig'),
    ).toThrow(BadRequestException);
  });
});
