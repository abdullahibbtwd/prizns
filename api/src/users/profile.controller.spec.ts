import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from './profile.controller';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
import { TranslationService } from '../translation/translation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { overrideGuards } from '../../test/helpers/guards';
import { mockAuthUser } from '../../test/helpers/mocks';

describe('ProfileController', () => {
  let controller: ProfileController;
  const users = { getProfile: jest.fn(), updateProfile: jest.fn() };
  const auth = { logoutOtherSessions: jest.fn(), sendEmailVerification: jest.fn() };
  const translation = { enqueueAuthor: jest.fn() };

  beforeEach(async () => {
    users.getProfile.mockReset();
    users.updateProfile.mockReset();
    auth.logoutOtherSessions.mockReset();
    auth.sendEmailVerification.mockReset();
    translation.enqueueAuthor.mockReset();
    const builder = Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        { provide: UsersService, useValue: users },
        { provide: AuthService, useValue: auth },
        { provide: TranslationService, useValue: translation },
      ],
    });
    overrideGuards(builder, JwtAuthGuard);
    const module = await builder.compile();
    controller = module.get(ProfileController);
  });

  it('returns the current user profile', () => {
    users.getProfile.mockResolvedValue({ id: mockAuthUser.id });
    controller.get(mockAuthUser);
    expect(users.getProfile).toHaveBeenCalledWith(mockAuthUser.id);
  });

  it('updates the profile and queues author translation', async () => {
    users.updateProfile.mockResolvedValue({
      profile: { id: mockAuthUser.id, authorId: 'a1' },
      authorUpdated: true,
      emailChanged: false,
    });
    const updated = await controller.update(mockAuthUser, { bio: 'Hello' });
    expect(updated.authorId).toBe('a1');
    expect(translation.enqueueAuthor).toHaveBeenCalledWith('a1');
  });

  it('revokes other sessions', () => {
    auth.logoutOtherSessions.mockResolvedValue({ revoked: 2 });
    const actor = { ...mockAuthUser, sessionId: 'sid-1' };
    controller.logoutOthers(actor);
    expect(auth.logoutOtherSessions).toHaveBeenCalledWith(actor.id, 'sid-1');
  });
});
