import 'reflect-metadata';
import { mockMailService } from './helpers/e2e-app';

/** Shared mail mock survives jest.clearAllMocks() in individual suites. */
afterEach(() => {
  if (jest.isMockFunction(mockMailService.send)) {
    mockMailService.send.mockResolvedValue({
      ids: ['e2e-email-id'],
      recipientCount: 1,
    });
  }
});
