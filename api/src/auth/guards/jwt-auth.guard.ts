import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService } from '../auth.service';
import { AUTH_COOKIES } from '../auth.types';
import { ALLOW_UNVERIFIED_EMAIL_KEY } from '../decorators/allow-unverified-email.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.cookies?.[AUTH_COOKIES.access] as string | undefined;

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    const user = await this.auth.validateAccessToken(token);
    (req as Request & { user: typeof user }).user = user;

    const allowUnverified = this.reflector.getAllAndOverride<boolean>(
      ALLOW_UNVERIFIED_EMAIL_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!user.emailVerified && !allowUnverified) {
      throw new ForbiddenException('Email verification required');
    }

    return true;
  }
}
