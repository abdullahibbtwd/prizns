import { Test, TestingModule } from '@nestjs/testing';
import { PublicSubmissionsController } from './public-submissions.controller';
import { SubmissionsService } from './submissions.service';

describe('PublicSubmissionsController', () => {
  let controller: PublicSubmissionsController;
  const submissions = { create: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PublicSubmissionsController],
      providers: [{ provide: SubmissionsService, useValue: submissions }],
    }).compile();
    controller = module.get(PublicSubmissionsController);
  });

  it('creates submission with files', () => {
    const dto = { name: 'A', email: 'a@example.com', title: 'Story' } as never;
    const files = { photos: [], documents: [] };
    const req = { ip: '127.0.0.1' } as never;
    controller.create(dto, files, req);
    expect(submissions.create).toHaveBeenCalledWith(dto, files, { ip: '127.0.0.1' });
  });
});
