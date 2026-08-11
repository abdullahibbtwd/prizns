import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'
import type { ReaderPayload } from '../reader-auth.types'

export const CurrentReader = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ReaderPayload => {
    const req = ctx.switchToHttp().getRequest<Request>()
    return (req as Request & { reader: ReaderPayload }).reader
  },
)
