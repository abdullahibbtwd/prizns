import 'reflect-metadata';
import { resetRateLimits } from '../src/common/rate-limit';
import { mockMailService } from './helpers/e2e-app';

/** Login/contact/newsletter limits are in-memory and shared within a file. */
beforeEach(() => {
  resetRateLimits();
});

/** Shared mail mock survives jest.clearAllMocks() in individual suites. */
afterEach(() => {
  if (jest.isMockFunction(mockMailService.send)) {
    mockMailService.send.mockResolvedValue({
      ids: ['e2e-email-id'],
      recipientCount: 1,
    });
  }
});
