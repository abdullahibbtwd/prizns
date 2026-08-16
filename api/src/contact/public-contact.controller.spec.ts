import { Test, TestingModule } from '@nestjs/testing';
import { PublicContactController } from './public-contact.controller';
import { ContactService } from './contact.service';

describe('PublicContactController', () => {
  let controller: PublicContactController;
  const contact = { create: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PublicContactController],
      providers: [{ provide: ContactService, useValue: contact }],
    }).compile();
    controller = module.get(PublicContactController);
  });

  it('delegates create to contact service', () => {
    const dto = {
      name: 'Reader',
      email: 'r@example.com',
      subject: 'Hi',
      message: 'Hello',
    };
    const req = { ip: '127.0.0.1' } as never;
    controller.create(dto, req);
    expect(contact.create).toHaveBeenCalledWith(dto, { ip: '127.0.0.1' });
  });
});
