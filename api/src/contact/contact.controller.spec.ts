import { Test, TestingModule } from '@nestjs/testing';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { overrideGuards } from '../../test/helpers/guards';

describe('ContactController', () => {
  let controller: ContactController;
  const contact = { list: jest.fn(), getById: jest.fn(), update: jest.fn() };

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [ContactController],
      providers: [{ provide: ContactService, useValue: contact }],
    });
    overrideGuards(builder, JwtAuthGuard);
    const module = await builder.compile();
    controller = module.get(ContactController);
  });

  it('lists inquiries with parsed filters', () => {
    controller.list('1', '10', 'hello', 'NEW', 'GENERAL');
    expect(contact.list).toHaveBeenCalled();
  });

  it('updates inquiry', () => {
    const dto = { status: 'READ' } as never;
    controller.update('inq-1', dto);
    expect(contact.update).toHaveBeenCalledWith('inq-1', dto);
  });
});
