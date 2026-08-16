import { Test, TestingModule } from '@nestjs/testing';
import { BadgesCmsController } from './badges.controller';
import { BadgesService } from './badges.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { overrideGuards } from '../../test/helpers/guards';

describe('BadgesCmsController', () => {
  let controller: BadgesCmsController;
  const badges = {
    listCmsBadges: jest.fn(),
    awardManual: jest.fn(),
    revoke: jest.fn(),
    evaluateAuthor: jest.fn(),
  };

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [BadgesCmsController],
      providers: [{ provide: BadgesService, useValue: badges }],
    });
    overrideGuards(builder, JwtAuthGuard, RolesGuard);
    const module = await builder.compile();
    controller = module.get(BadgesCmsController);
  });

  it('lists cms badges', () => {
    controller.list();
    expect(badges.listCmsBadges).toHaveBeenCalled();
  });

  it('awards badge manually', () => {
    controller.award({ authorId: 'a1', badgeId: 'b1' });
    expect(badges.awardManual).toHaveBeenCalledWith('a1', 'b1');
  });

  it('evaluates author badges', () => {
    controller.evaluate('author-1');
    expect(badges.evaluateAuthor).toHaveBeenCalledWith('author-1');
  });
});
