import { Test, TestingModule } from '@nestjs/testing';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { overrideGuards } from '../../test/helpers/guards';

describe('NewsletterController', () => {
  let controller: NewsletterController;
  const newsletter = { list: jest.fn(), count: jest.fn(), remove: jest.fn() };

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [NewsletterController],
      providers: [{ provide: NewsletterService, useValue: newsletter }],
    });
    overrideGuards(builder, JwtAuthGuard);
    const module = await builder.compile();
    controller = module.get(NewsletterController);
  });

  it('lists subscribers', () => {
    controller.list('1', '20', 'test');
    expect(newsletter.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 20, q: 'test' }),
    );
  });

  it('returns subscriber count', () => {
    controller.count();
    expect(newsletter.count).toHaveBeenCalled();
  });
});
