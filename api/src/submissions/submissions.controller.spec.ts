import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { overrideGuards } from '../../test/helpers/guards';

describe('SubmissionsController', () => {
  let controller: SubmissionsController;
  const submissions = {
    list: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    convertToDraft: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [SubmissionsController],
      providers: [{ provide: SubmissionsService, useValue: submissions }],
    });
    overrideGuards(builder, JwtAuthGuard);
    const module = await builder.compile();
    controller = module.get(SubmissionsController);
  });

  it('lists submissions', () => {
    controller.list('1', '10', 'vidin', 'NEW');
    expect(submissions.list).toHaveBeenCalled();
  });

  it('converts submission to draft', () => {
    controller.convert('sub-1');
    expect(submissions.convertToDraft).toHaveBeenCalledWith('sub-1');
  });
});
