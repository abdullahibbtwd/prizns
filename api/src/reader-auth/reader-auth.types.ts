export const READER_AUTH_COOKIES = {
  access: 'prizn_reader_access',
  refresh: 'prizn_reader_refresh',
} as const

export const READER_JWT_AUD = 'reader' as const

export type ReaderPayload = {
  id: string
  email: string
  name: string | null
  locale: string | null
}

export type ReaderJwtAccessPayload = {
  sub: string
  sid: string
  email: string
  aud: typeof READER_JWT_AUD
  type: 'access'
}

export type ReaderJwtRefreshPayload = {
  sub: string
  sid: string
  tid: string
  aud: typeof READER_JWT_AUD
  type: 'refresh'
}

export type ReaderSessionRecord = {
  readerId: string
  email: string
  name: string | null
  locale: string | null
  createdAt: string
}

export type MagicLinkIntent = {
  type: 'save'
  articleId: string
}
