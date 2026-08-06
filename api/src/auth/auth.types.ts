export const AUTH_COOKIES = {
  access: 'prizn_access',
  refresh: 'prizn_refresh',
} as const;

export type AuthUserPayload = {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'EDITOR';
};

export type JwtAccessPayload = {
  sub: string;
  sid: string;
  email: string;
  role: 'ADMIN' | 'EDITOR';
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
  role: 'ADMIN' | 'EDITOR';
  name: string | null;
  createdAt: string;
};
