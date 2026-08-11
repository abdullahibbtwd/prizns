import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Prisma } from '@prisma/client'
import { createHash, randomBytes, randomUUID } from 'crypto'
import type { Response } from 'express'
import { MailService } from '../mail/mail.service'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import type { RequestMagicLinkDto } from './dto/magic-link.dto'
import {
  READER_AUTH_COOKIES,
  READER_JWT_AUD,
  type MagicLinkIntent,
  type ReaderJwtAccessPayload,
  type ReaderJwtRefreshPayload,
  type ReaderPayload,
  type ReaderSessionRecord,
} from './reader-auth.types'

const MAGIC_LINK_TTL_MS = 20 * 60 * 1000

@Injectable()
export class ReaderAuthService {
  private readonly logger = new Logger(ReaderAuthService.name)
  private readonly rateBuckets = new Map<
    string,
    { count: number; resetAt: number }
  >()

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  isEnabled() {
    const flag = this.config.get<string>('FEATURE_READER_AUTH')?.trim().toLowerCase()
    return flag !== 'false' && flag !== '0'
  }

  assertEnabled() {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException(
        'Reader auth is disabled. Set FEATURE_READER_AUTH=true to enable.',
      )
    }
  }

  private sessionKey(sessionId: string) {
    return `reader-session:${sessionId}`
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex')
  }

  private isSecureCookies() {
    const explicit = this.config.get<string>('COOKIE_SECURE')
    if (explicit === 'true') return true
    if (explicit === 'false') return false
    return this.config.get<string>('NODE_ENV') === 'production'
  }

  private accessTtlSeconds() {
    return Number(this.config.get('JWT_ACCESS_TTL_SECONDS') ?? 900)
  }

  private refreshTtlSeconds() {
    return Number(this.config.get('JWT_REFRESH_TTL_SECONDS') ?? 60 * 60 * 24 * 7)
  }

  private cookieOptions(maxAgeMs: number, path = '/') {
    return {
      httpOnly: true,
      secure: this.isSecureCookies(),
      sameSite: 'lax' as const,
      path,
      maxAge: maxAgeMs,
    }
  }

  setAuthCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    res.cookie(
      READER_AUTH_COOKIES.access,
      tokens.accessToken,
      this.cookieOptions(this.accessTtlSeconds() * 1000),
    )
    res.cookie(
      READER_AUTH_COOKIES.refresh,
      tokens.refreshToken,
      this.cookieOptions(this.refreshTtlSeconds() * 1000, '/api/reader-auth'),
    )
  }

  clearAuthCookies(res: Response) {
    const base = {
      httpOnly: true,
      secure: this.isSecureCookies(),
      sameSite: 'lax' as const,
    }
    res.clearCookie(READER_AUTH_COOKIES.access, { ...base, path: '/' })
    res.clearCookie(READER_AUTH_COOKIES.refresh, {
      ...base,
      path: '/api/reader-auth',
    })
  }

  private assertRateLimit(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now()
    const bucket = this.rateBuckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      this.rateBuckets.set(key, { count: 1, resetAt: now + windowMs })
      return true
    }
    bucket.count += 1
    return bucket.count <= limit
  }

  private siteOrigin() {
    const raw =
      this.config.get<string>('PUBLIC_SITE_URL')?.trim().replace(/\/$/, '') ||
      ''
    // Guard against placeholder values left in .env templates
    if (
      raw &&
      !/your-domain|example\.com|changeme/i.test(raw) &&
      /^https?:\/\//i.test(raw)
    ) {
      return raw
    }
    return 'http://localhost:5175'
  }

  private sanitizeReturnUrl(raw?: string | null): string | null {
    if (!raw?.trim()) return null
    const value = raw.trim()
    const origin = this.siteOrigin()
    try {
      if (value.startsWith('/')) {
        if (value.startsWith('//')) return null
        return value.slice(0, 500)
      }
      const url = new URL(value)
      if (url.origin !== new URL(origin).origin) return null
      return `${url.pathname}${url.search}${url.hash}`.slice(0, 500)
    } catch {
      return null
    }
  }

  private toReader(reader: {
    id: string
    email: string
    name: string | null
    locale: string | null
  }): ReaderPayload {
    return {
      id: reader.id,
      email: reader.email,
      name: reader.name,
      locale: reader.locale,
    }
  }

  private async issueSession(
    reader: {
      id: string
      email: string
      name: string | null
      locale: string | null
    },
    meta: { userAgent?: string; ip?: string },
  ) {
    const sessionId = randomUUID()
    const refreshTokenId = randomUUID()

    const accessPayload: ReaderJwtAccessPayload = {
      sub: reader.id,
      sid: sessionId,
      email: reader.email,
      aud: READER_JWT_AUD,
      type: 'access',
    }

    const refreshPayload: ReaderJwtRefreshPayload = {
      sub: reader.id,
      sid: sessionId,
      tid: refreshTokenId,
      aud: READER_JWT_AUD,
      type: 'refresh',
    }

    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.accessTtlSeconds(),
    })

    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.refreshTtlSeconds(),
    })

    const session: ReaderSessionRecord = {
      readerId: reader.id,
      email: reader.email,
      name: reader.name,
      locale: reader.locale,
      createdAt: new Date().toISOString(),
    }

    await this.redis.client.set(
      this.sessionKey(sessionId),
      JSON.stringify(session),
      'EX',
      this.refreshTtlSeconds(),
    )

    await this.prisma.readerRefreshToken.create({
      data: {
        id: refreshTokenId,
        tokenHash: this.hashToken(refreshToken),
        sessionId,
        readerId: reader.id,
        expiresAt: new Date(Date.now() + this.refreshTtlSeconds() * 1000),
        userAgent: meta.userAgent,
        ip: meta.ip,
      },
    })

    return { accessToken, refreshToken, sessionId }
  }

  private magicLinkEmail(opts: {
    email: string
    verifyUrl: string
    locale?: string | null
  }) {
    const isEn = (opts.locale || '').toLowerCase().startsWith('en')
    const subject = isEn
      ? 'Your Prizni sign-in link'
      : 'Вашата връзка за вход в Призни'
    const heading = isEn ? 'Sign in to Prizni' : 'Вход в Призни'
    const body = isEn
      ? 'Click the button below to sign in. This link expires in 20 minutes and can be used once.'
      : 'Натиснете бутона по-долу, за да влезете. Връзката е валидна 20 минути и може да се използва само веднъж.'
    const cta = isEn ? 'Sign in' : 'Влез'
    const ignore = isEn
      ? 'If you did not request this, you can ignore this email.'
      : 'Ако не сте заявили това, можете да игнорирате имейла.'

    const html = `
      <div style="font-family: Georgia, serif; color: #1A1A1A; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 22px; color: #0C2686;">${heading}</h1>
        <p style="line-height: 1.6;">${body}</p>
        <p style="margin: 28px 0;">
          <a href="${opts.verifyUrl}" style="background:#0C2686;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-family:sans-serif;font-size:14px;">${cta}</a>
        </p>
        <p style="font-size: 13px; color: #666; line-height: 1.5;">${ignore}</p>
        <p style="font-size: 12px; color: #999; word-break: break-all;">${opts.verifyUrl}</p>
      </div>
    `
    const text = `${heading}\n\n${body}\n\n${opts.verifyUrl}\n\n${ignore}`
    return { subject, html, text }
  }

  async requestMagicLink(
    dto: RequestMagicLinkDto,
    meta: { userAgent?: string; ip?: string },
  ): Promise<
    | { ok: true; authenticated: false }
    | {
        ok: true
        authenticated: true
        reader: ReaderPayload
        accessToken: string
        refreshToken: string
        intent: MagicLinkIntent | null
        returnUrl: string | null
      }
  > {
    this.assertEnabled()

    const email = dto.email.toLowerCase().trim()
    const ip = meta.ip || 'unknown'

    if (
      !this.assertRateLimit(`email:${email}`, 5, 15 * 60 * 1000) ||
      !this.assertRateLimit(`ip:${ip}`, 20, 60 * 60 * 1000)
    ) {
      // Enumeration-safe: always look successful
      return { ok: true, authenticated: false }
    }

    const returnUrl = this.sanitizeReturnUrl(dto.returnUrl)
    const intent: MagicLinkIntent | null =
      dto.intent?.type === 'save' && dto.intent.articleId
        ? { type: 'save', articleId: dto.intent.articleId.trim() }
        : null

    const existing = await this.prisma.reader.findUnique({
      where: { email },
    })

    // Email already confirmed via a prior magic-link click — sign in directly.
    if (existing?.lastLoginAt) {
      const reader = await this.prisma.reader.update({
        where: { id: existing.id },
        data: {
          lastLoginAt: new Date(),
          ...(dto.locale?.trim()
            ? { locale: dto.locale.trim().slice(0, 8) }
            : {}),
        },
      })
      const tokens = await this.issueSession(reader, meta)
      return {
        ok: true,
        authenticated: true,
        reader: this.toReader(reader),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        intent,
        returnUrl,
      }
    }

    const reader = await this.prisma.reader.upsert({
      where: { email },
      create: {
        email,
        locale: dto.locale?.trim().slice(0, 8) || null,
      },
      update: {
        ...(dto.locale?.trim()
          ? { locale: dto.locale.trim().slice(0, 8) }
          : {}),
      },
    })

    const rawToken = randomBytes(32).toString('base64url')
    const tokenHash = this.hashToken(rawToken)

    await this.prisma.magicLinkToken.create({
      data: {
        readerId: reader.id,
        tokenHash,
        expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS),
        returnUrl,
        intent: intent
          ? (intent as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    })

    const verifyUrl = `${this.siteOrigin()}/auth/verify?token=${encodeURIComponent(rawToken)}`
    const mailContent = this.magicLinkEmail({
      email,
      verifyUrl,
      locale: dto.locale || reader.locale,
    })

    if (this.mail.isConfigured()) {
      try {
        await this.mail.send({
          to: email,
          subject: mailContent.subject,
          html: mailContent.html,
          text: mailContent.text,
        })
      } catch (error) {
        this.logger.error(
          `Failed to send magic link to ${email}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
      }
    } else if (this.config.get<string>('NODE_ENV') !== 'production') {
      this.logger.warn(
        `RESEND not configured — magic link for ${email}: ${verifyUrl}`,
      )
    } else {
      this.logger.error('RESEND_API_KEY missing; cannot send magic link email')
    }

    return { ok: true, authenticated: false }
  }

  async verifyMagicLink(
    token: string,
    meta: { userAgent?: string; ip?: string },
  ): Promise<{
    reader: ReaderPayload
    accessToken: string
    refreshToken: string
    intent: MagicLinkIntent | null
    returnUrl: string | null
  }> {
    this.assertEnabled()

    const tokenHash = this.hashToken(token.trim())
    const row = await this.prisma.magicLinkToken.findUnique({
      where: { tokenHash },
      include: { reader: true },
    })

    if (!row || row.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Invalid or expired sign-in link')
    }

    // Already used — allow a short replay window so React StrictMode / double
    // clicks don't strand the reader after a successful first consume.
    if (row.consumedAt) {
      const ageMs = Date.now() - row.consumedAt.getTime()
      if (ageMs > 2 * 60 * 1000) {
        throw new UnauthorizedException('Invalid or expired sign-in link')
      }
      const tokens = await this.issueSession(row.reader, meta)
      const intent =
        row.intent &&
        typeof row.intent === 'object' &&
        !Array.isArray(row.intent) &&
        (row.intent as { type?: string }).type === 'save'
          ? (row.intent as MagicLinkIntent)
          : null
      return {
        reader: this.toReader(row.reader),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        intent,
        returnUrl: row.returnUrl,
      }
    }

    // Consume atomically only if still unused — prevents double-spend races.
    const consumed = await this.prisma.magicLinkToken.updateMany({
      where: { id: row.id, consumedAt: null },
      data: { consumedAt: new Date() },
    })
    if (consumed.count === 0) {
      // Lost the race to another request; retry as replay.
      return this.verifyMagicLink(token, meta)
    }

    const reader = await this.prisma.reader.update({
      where: { id: row.readerId },
      data: { lastLoginAt: new Date() },
    })

    let tokens: {
      accessToken: string
      refreshToken: string
      sessionId: string
    }
    try {
      tokens = await this.issueSession(reader, meta)
    } catch (error) {
      // Roll back consume so the link can be retried after a transient failure.
      await this.prisma.magicLinkToken.update({
        where: { id: row.id },
        data: { consumedAt: null },
      })
      throw error
    }

    const intent =
      row.intent &&
      typeof row.intent === 'object' &&
      !Array.isArray(row.intent) &&
      (row.intent as { type?: string }).type === 'save'
        ? (row.intent as MagicLinkIntent)
        : null

    return {
      reader: this.toReader(reader),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      intent,
      returnUrl: row.returnUrl,
    }
  }

  async validateAccessToken(token: string): Promise<ReaderPayload> {
    let payload: ReaderJwtAccessPayload
    try {
      payload = await this.jwt.verifyAsync<ReaderJwtAccessPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        audience: READER_JWT_AUD,
      })
    } catch {
      throw new UnauthorizedException('Invalid or expired access token')
    }

    if (payload.type !== 'access' || payload.aud !== READER_JWT_AUD) {
      throw new UnauthorizedException('Invalid access token')
    }

    const raw = await this.redis.client.get(this.sessionKey(payload.sid))
    if (!raw) {
      throw new UnauthorizedException('Session expired')
    }

    const session = JSON.parse(raw) as ReaderSessionRecord
    if (session.readerId !== payload.sub) {
      throw new UnauthorizedException('Invalid session')
    }

    const reader = await this.prisma.reader.findUnique({
      where: { id: payload.sub },
    })
    if (!reader) {
      throw new UnauthorizedException('Reader not found')
    }

    return this.toReader(reader)
  }

  /** Soft peek for analytics — returns null if not logged in. */
  async peekReaderId(accessToken?: string): Promise<string | null> {
    if (!accessToken || !this.isEnabled()) return null
    try {
      const reader = await this.validateAccessToken(accessToken)
      return reader.id
    } catch {
      return null
    }
  }

  async refresh(
    refreshToken: string,
    meta: { userAgent?: string; ip?: string },
  ) {
    this.assertEnabled()

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing')
    }

    let payload: ReaderJwtRefreshPayload
    try {
      payload = await this.jwt.verifyAsync<ReaderJwtRefreshPayload>(
        refreshToken,
        {
          secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
          audience: READER_JWT_AUD,
        },
      )
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token')
    }

    if (payload.type !== 'refresh' || payload.aud !== READER_JWT_AUD) {
      throw new UnauthorizedException('Invalid refresh token')
    }

    const tokenHash = this.hashToken(refreshToken)
    const stored = await this.prisma.readerRefreshToken.findUnique({
      where: { tokenHash },
      include: { reader: true },
    })

    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt.getTime() < Date.now() ||
      stored.sessionId !== payload.sid ||
      stored.id !== payload.tid
    ) {
      await this.revokeSession(payload.sid)
      throw new UnauthorizedException('Refresh token revoked or unknown')
    }

    await this.prisma.readerRefreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    })
    await this.redis.client.del(this.sessionKey(payload.sid))

    const tokens = await this.issueSession(stored.reader, meta)
    return {
      reader: this.toReader(stored.reader),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }
  }

  async logout(accessToken?: string, refreshToken?: string) {
    if (refreshToken) {
      try {
        const payload = await this.jwt.verifyAsync<ReaderJwtRefreshPayload>(
          refreshToken,
          {
            secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
            ignoreExpiration: true,
            audience: READER_JWT_AUD,
          },
        )
        await this.revokeSession(payload.sid)
        await this.prisma.readerRefreshToken.updateMany({
          where: {
            tokenHash: this.hashToken(refreshToken),
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        })
        return
      } catch {
        // fall through
      }
    }

    if (accessToken) {
      try {
        const payload = await this.jwt.verifyAsync<ReaderJwtAccessPayload>(
          accessToken,
          {
            secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
            ignoreExpiration: true,
            audience: READER_JWT_AUD,
          },
        )
        await this.revokeSession(payload.sid)
      } catch {
        // ignore
      }
    }
  }

  private async revokeSession(sessionId: string) {
    await this.redis.client.del(this.sessionKey(sessionId))
    await this.prisma.readerRefreshToken.updateMany({
      where: { sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  async me(readerId: string): Promise<ReaderPayload> {
    const reader = await this.prisma.reader.findUnique({
      where: { id: readerId },
    })
    if (!reader) {
      throw new UnauthorizedException('Reader not found')
    }
    return this.toReader(reader)
  }
}
