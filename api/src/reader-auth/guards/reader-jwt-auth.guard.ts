import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import type { Request } from 'express'
import { ReaderAuthService } from '../reader-auth.service'
import { READER_AUTH_COOKIES } from '../reader-auth.types'

@Injectable()
export class ReaderJwtAuthGuard implements CanActivate {
  constructor(private readonly readerAuth: ReaderAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    this.readerAuth.assertEnabled()
    const req = context.switchToHttp().getRequest<Request>()
    const token = req.cookies?.[READER_AUTH_COOKIES.access] as
      | string
      | undefined

    if (!token) {
      throw new UnauthorizedException('Authentication required')
    }

    const reader = await this.readerAuth.validateAccessToken(token)
    ;(req as Request & { reader: typeof reader }).reader = reader
    return true
  }
}
