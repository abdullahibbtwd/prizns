import { SetMetadata } from '@nestjs/common';

export const ALLOW_UNVERIFIED_EMAIL_KEY = 'allowUnverifiedEmail';

/** Lets an authenticated but unverified user hit this handler. */
export const AllowUnverifiedEmail = () =>
  SetMetadata(ALLOW_UNVERIFIED_EMAIL_KEY, true);
