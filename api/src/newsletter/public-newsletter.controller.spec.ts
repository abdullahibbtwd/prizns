import { Test, TestingModule } from '@nestjs/testing';
import { PublicNewsletterController } from './public-newsletter.controller';
import { NewsletterService } from './newsletter.service';

describe('PublicNewsletterController', () => {
  let controller: PublicNewsletterController;
  const newsletter = { subscribe: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PublicNewsletterController],
      providers: [{ provide: NewsletterService, useValue: newsletter }],
    }).compile();
    controller = module.get(PublicNewsletterController);
  });

  it('delegates subscribe to service', () => {
    const dto = { email: 'reader@example.com' };
    const req = { ip: '127.0.0.1' } as never;
    controller.subscribe(dto, req);
    expect(newsletter.subscribe).toHaveBeenCalledWith(dto, { ip: '127.0.0.1' });
  });
});
