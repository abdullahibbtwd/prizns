import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  AUTH_COOKIES,
  type AuthUserPayload,
  type JwtAccessPayload,
  type JwtRefreshPayload,
  type SessionRecord,
} from './auth.types';
import type { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
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
    role: 'ADMIN' | 'EDITOR';
  }): AuthUserPayload {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  private async issueSession(
    user: {
      id: string;
      email: string;
      name: string | null;
      role: 'ADMIN' | 'EDITOR';
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
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueSession(user, meta);
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

    return this.toAuthUser(user);
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

  async me(userId: string): Promise<AuthUserPayload> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }
    return this.toAuthUser(user);
  }
}
