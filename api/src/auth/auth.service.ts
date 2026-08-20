import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import * as bcrypt from 'bcrypt';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';
import {
  AUTH_COOKIES,
  type AuthUserPayload,
  type JwtAccessPayload,
  type JwtRefreshPayload,
  type SessionRecord,
} from './auth.types';
import type { LoginDto } from './dto/login.dto';
import { checkRateLimit } from '../common/rate-limit';

const VERIFY_TTL_SECONDS = 15 * 60;
const RESEND_COOLDOWN_SECONDS = 60;
const VERIFY_MAX_ATTEMPTS = 5;
const VERIFY_SEND_LIMIT_USER = 3;
const VERIFY_SEND_LIMIT_IP = 10;
const VERIFY_SEND_WINDOW_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  private sessionKey(sessionId: string) {
    return `session:${sessionId}`;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private isSecureCookies() {
    // Explicit override wins (needed for http:// Coolify/IP deploys).
    const explicit = this.config.get<string>('COOKIE_SECURE');
    if (explicit === 'true') return true;
    if (explicit === 'false') return false;
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  private accessTtlSeconds() {
    return Number(this.config.get('JWT_ACCESS_TTL_SECONDS') ?? 900);
  }

  private refreshTtlSeconds() {
    return Number(this.config.get('JWT_REFRESH_TTL_SECONDS') ?? 60 * 60 * 24 * 7);
  }

  private cookieOptions(maxAgeMs: number, path = '/') {
    return {
      httpOnly: true,
      secure: this.isSecureCookies(),
      sameSite: 'lax' as const,
      path,
      maxAge: maxAgeMs,
    };
  }

  setAuthCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    res.cookie(
      AUTH_COOKIES.access,
      tokens.accessToken,
      this.cookieOptions(this.accessTtlSeconds() * 1000),
    );
    res.cookie(
      AUTH_COOKIES.refresh,
      tokens.refreshToken,
      this.cookieOptions(this.refreshTtlSeconds() * 1000, '/api/auth'),
    );
  }

  clearAuthCookies(res: Response) {
    const base = {
      httpOnly: true,
      secure: this.isSecureCookies(),
      sameSite: 'lax' as const,
    };
    res.clearCookie(AUTH_COOKIES.access, { ...base, path: '/' });
    res.clearCookie(AUTH_COOKIES.refresh, { ...base, path: '/api/auth' });
  }

  private toAuthUser(user: {
    id: string;
    email: string;
    name: string | null;
    role: AuthUserPayload['role'];
    roles?: AuthUserPayload['roles'] | null;
    imageUrl?: string | null;
    emailVerifiedAt?: Date | null;
  }): AuthUserPayload {
    const roles = user.roles?.length ? user.roles : [user.role];
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      roles,
      imageUrl: user.imageUrl ?? null,
      emailVerified: Boolean(user.emailVerifiedAt),
    };
  }

  private verifyCodeKey(userId: string) {
    return `email-verify:${userId}`;
  }

  private verifyAttemptsKey(userId: string) {
    return `email-verify-attempts:${userId}`;
  }

  private verifyCooldownKey(userId: string) {
    return `email-verify-cooldown:${userId}`;
  }

  private hashesEqual(left: string, right: string) {
    const a = Buffer.from(left, 'hex');
    const b = Buffer.from(right, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  private greetingName(name: string | null, email: string) {
    return name?.trim() ? name.trim() : email;
  }

  private verificationEmail(opts: {
    email: string;
    name: string | null;
    code: string;
  }) {
    const greeting = this.greetingName(opts.name, opts.email);
    const subject = 'Your Prizni CMS verification code';
    const html = `
      <div style="font-family: Georgia, serif; color: #1A1A1A; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 22px; color: #0C2686;">Confirm your email</h1>
        <p style="line-height: 1.6;">Hi ${greeting}, use this 6-digit code to finish signing in to the CMS. It expires in 15 minutes.</p>
        <p style="margin: 28px 0; font-family: ui-monospace, monospace; font-size: 32px; letter-spacing: 0.35em; font-weight: 700; color: #0C2686;">${opts.code}</p>
        <p style="font-size: 13px; color: #666; line-height: 1.5;">If you did not expect this email, you can ignore it.</p>
      </div>
    `;
    const text = `Confirm your email\n\nHi ${greeting}, your Prizni CMS code is ${opts.code}. It expires in 15 minutes.`;
    return { subject, html, text };
  }

  private accountCreatedEmail(opts: { email: string; name: string | null }) {
    const greeting = this.greetingName(opts.name, opts.email);
    const subject = 'Your Prizni CMS account is ready';
    const html = `
      <div style="font-family: Georgia, serif; color: #1A1A1A; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 22px; color: #0C2686;">Your account has been created</h1>
        <p style="line-height: 1.6;">Hi ${greeting}, your Prizni CMS account is ready. You can sign in now with the email and password you were given.</p>
        <p style="line-height: 1.6;">The first time you sign in we will email you a 6-digit code to confirm your address. That code expires in 15 minutes.</p>
        <p style="font-size: 13px; color: #666; line-height: 1.5;">If you did not expect this email, you can ignore it.</p>
      </div>
    `;
    const text = `Your account has been created\n\nHi ${greeting}, your Prizni CMS account is ready. You can sign in now.\n\nThe first time you sign in we will email you a 6-digit code to confirm your address. That code expires in 15 minutes.`;
    return { subject, html, text };
  }

  private async deliverCmsEmail(
    to: string,
    content: { subject: string; html: string; text: string },
    logLabel: string,
    devDetail?: string,
  ) {
    if (this.mail.isConfigured()) {
      try {
        await this.mail.send({
          to,
          subject: content.subject,
          html: content.html,
          text: content.text,
        });
      } catch (error) {
        this.logger.error(
          `Failed to send ${logLabel} to ${to}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      return;
    }

    if (this.config.get<string>('NODE_ENV') !== 'production') {
      this.logger.warn(
        `RESEND not configured — ${logLabel} for ${to}${
          devDetail ? `: ${devDetail}` : ''
        }`,
      );
      return;
    }
    this.logger.error(`RESEND_API_KEY missing; cannot send ${logLabel}`);
  }

  async sendEmailVerification(
    userId: string,
    opts: {
      replaceExisting?: boolean;
      skipCooldown?: boolean;
      ip?: string;
    } = {},
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }
    if (user.emailVerifiedAt) {
      return { sent: false, alreadyVerified: true };
    }

    const ip = opts.ip || 'unknown';
    if (
      !checkRateLimit(
        'auth-verify-send',
        `user:${user.id}`,
        VERIFY_SEND_LIMIT_USER,
        VERIFY_SEND_WINDOW_MS,
      ) ||
      !checkRateLimit(
        'auth-verify-send',
        `email:${user.email}`,
        VERIFY_SEND_LIMIT_USER,
        VERIFY_SEND_WINDOW_MS,
      ) ||
      !checkRateLimit(
        'auth-verify-send',
        `ip:${ip}`,
        VERIFY_SEND_LIMIT_IP,
        VERIFY_SEND_WINDOW_MS,
      )
    ) {
      throw new HttpException(
        'Too many verification codes. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!opts.replaceExisting) {
      const existing = await this.redis.client.get(this.verifyCodeKey(user.id));
      if (existing) return { sent: false, alreadyVerified: false };
    }

    if (!opts.skipCooldown) {
      const cooldown = await this.redis.client.set(
        this.verifyCooldownKey(user.id),
        '1',
        'EX',
        RESEND_COOLDOWN_SECONDS,
        'NX',
      );
      if (cooldown !== 'OK') {
        throw new HttpException(
          'Wait before requesting another code.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const code = String(randomInt(100000, 1_000_000));
    await this.redis.client.set(
      this.verifyCodeKey(user.id),
      this.hashToken(`${user.id}:${code}`),
      'EX',
      VERIFY_TTL_SECONDS,
    );
    await this.redis.client.del(this.verifyAttemptsKey(user.id));

    const mailContent = this.verificationEmail({
      email: user.email,
      name: user.name,
      code,
    });
    await this.deliverCmsEmail(
      user.email,
      mailContent,
      'CMS verification email',
      code,
    );

    return { sent: true, alreadyVerified: false };
  }

  async sendAccountCreatedEmail(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) return { sent: false };
    await this.deliverCmsEmail(
      user.email,
      this.accountCreatedEmail({ email: user.email, name: user.name }),
      'CMS account-created email',
    );
    return { sent: true };
  }

  async verifyEmail(userId: string, code: string): Promise<AuthUserPayload> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }
    if (user.emailVerifiedAt) {
      return this.toAuthUser(user);
    }

    const stored = await this.redis.client.get(this.verifyCodeKey(user.id));
    if (!stored) {
      throw new BadRequestException('Invalid or expired code');
    }

    const attemptsRaw = await this.redis.client.get(
      this.verifyAttemptsKey(user.id),
    );
    const attempts = Number(attemptsRaw ?? 0);
    if (attempts >= VERIFY_MAX_ATTEMPTS) {
      throw new HttpException(
        'Too many attempts. Request a new code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const expected = this.hashToken(`${user.id}:${code.trim()}`);
    if (!this.hashesEqual(stored, expected)) {
      await this.redis.client.set(
        this.verifyAttemptsKey(user.id),
        String(attempts + 1),
        'EX',
        VERIFY_TTL_SECONDS,
      );
      throw new BadRequestException('Invalid or expired code');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    });
    await this.redis.client.del(
      this.verifyCodeKey(user.id),
      this.verifyAttemptsKey(user.id),
      this.verifyCooldownKey(user.id),
    );
    return this.toAuthUser(updated);
  }

  private async issueSession(
    user: {
      id: string;
      email: string;
      name: string | null;
      role: AuthUserPayload['role'];
    },
    meta: { userAgent?: string; ip?: string },
  ) {
    const sessionId = randomUUID();
    const refreshTokenId = randomUUID();

    const accessPayload: JwtAccessPayload = {
      sub: user.id,
      sid: sessionId,
      email: user.email,
      role: user.role,
      type: 'access',
    };

    const refreshPayload: JwtRefreshPayload = {
      sub: user.id,
      sid: sessionId,
      tid: refreshTokenId,
      type: 'refresh',
    };

    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.accessTtlSeconds(),
    });

    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.refreshTtlSeconds(),
    });

    const session: SessionRecord = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      createdAt: new Date().toISOString(),
    };

    await this.redis.client.set(
      this.sessionKey(sessionId),
      JSON.stringify(session),
      'EX',
      this.refreshTtlSeconds(),
    );

    await this.prisma.refreshToken.create({
      data: {
        id: refreshTokenId,
        tokenHash: this.hashToken(refreshToken),
        sessionId,
        userId: user.id,
        expiresAt: new Date(Date.now() + this.refreshTtlSeconds() * 1000),
        userAgent: meta.userAgent,
        ip: meta.ip,
      },
    });

    return { accessToken, refreshToken, sessionId };
  }

  async login(
    dto: LoginDto,
    meta: { userAgent?: string; ip?: string },
  ): Promise<{ user: AuthUserPayload; accessToken: string; refreshToken: string }> {
    const email = dto.email.toLowerCase().trim();
    const ip = meta.ip || 'unknown';

    if (
      !checkRateLimit('auth-login', `ip:${ip}`, 10, 15 * 60 * 1000) ||
      !checkRateLimit('auth-login', `email:${email}`, 5, 15 * 60 * 1000)
    ) {
      throw new HttpException(
        'Too many login attempts. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueSession(user, meta);
    if (!user.emailVerifiedAt) {
      await this.sendEmailVerification(user.id, {
        replaceExisting: true,
        skipCooldown: true,
        ip: meta.ip,
      });
    }
    return {
      user: this.toAuthUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async validateAccessToken(token: string): Promise<AuthUserPayload> {
    let payload: JwtAccessPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtAccessPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid access token');
    }

    const raw = await this.redis.client.get(this.sessionKey(payload.sid));
    if (!raw) {
      throw new UnauthorizedException('Session expired');
    }

    const session = JSON.parse(raw) as SessionRecord;
    if (session.userId !== payload.sub || !session.userId) {
      throw new UnauthorizedException('Invalid session');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User inactive');
    }

    return { ...this.toAuthUser(user), sessionId: payload.sid };
  }

  async refresh(
    refreshToken: string,
    meta: { userAgent?: string; ip?: string },
  ): Promise<{ user: AuthUserPayload; accessToken: string; refreshToken: string }> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    let payload: JwtRefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtRefreshPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt.getTime() < Date.now() ||
      stored.sessionId !== payload.sid ||
      stored.id !== payload.tid
    ) {
      // Possible reuse — kill the session
      await this.revokeSession(payload.sid);
      throw new UnauthorizedException('Refresh token revoked or unknown');
    }

    // Rotate: revoke old refresh, remove old session, issue new pair
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    await this.redis.client.del(this.sessionKey(payload.sid));

    if (!stored.user.isActive) {
      throw new UnauthorizedException('User inactive');
    }

    const tokens = await this.issueSession(stored.user, meta);
    return {
      user: this.toAuthUser(stored.user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(accessToken?: string, refreshToken?: string) {
    if (refreshToken) {
      try {
        const payload = await this.jwt.verifyAsync<JwtRefreshPayload>(
          refreshToken,
          {
            secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
            ignoreExpiration: true,
          },
        );
        await this.revokeSession(payload.sid);
        await this.prisma.refreshToken.updateMany({
          where: {
            tokenHash: this.hashToken(refreshToken),
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        });
        return;
      } catch {
        // fall through to access-token path
      }
    }

    if (accessToken) {
      try {
        const payload = await this.jwt.verifyAsync<JwtAccessPayload>(
          accessToken,
          {
            secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
            ignoreExpiration: true,
          },
        );
        await this.revokeSession(payload.sid);
      } catch {
        // ignore
      }
    }
  }

  private async revokeSession(sessionId: string) {
    await this.redis.client.del(this.sessionKey(sessionId));
    await this.prisma.refreshToken.updateMany({
      where: { sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async logoutOtherSessions(userId: string, currentSessionId: string) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        sessionId: { not: currentSessionId },
      },
      select: { sessionId: true },
    });
    const sessionIds = [...new Set(tokens.map((token) => token.sessionId))];
    for (const sessionId of sessionIds) {
      await this.revokeSession(sessionId);
    }
    return { revoked: sessionIds.length };
  }

  async me(userId: string): Promise<AuthUserPayload> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }
    return this.toAuthUser(user);
  }
}
