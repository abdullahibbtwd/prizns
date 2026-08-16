import type { Role } from '@prisma/client';

export const AUTH_COOKIES = {
  access: 'prizn_access',
  refresh: 'prizn_refresh',
} as const;

export type AuthUserPayload = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  imageUrl: string | null;
  emailVerified: boolean;
  sessionId?: string;
};

export type JwtAccessPayload = {
  sub: string;
  sid: string;
  email: string;
  role: Role;
  type: 'access';
};

export type JwtRefreshPayload = {
  sub: string;
  sid: string;
  tid: string;
  type: 'refresh';
};

export type SessionRecord = {
  userId: string;
  email: string;
  role: Role;
  name: string | null;
  createdAt: string;
};
