import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth.service';
import { AUTH_COOKIES } from '../auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.cookies?.[AUTH_COOKIES.access] as string | undefined;

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    const user = await this.auth.validateAccessToken(token);
    (req as Request & { user: typeof user }).user = user;
    return true;
  }
}
