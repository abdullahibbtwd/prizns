import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import {
  RequestMagicLinkDto,
  VerifyMagicLinkDto,
} from './dto/magic-link.dto'
import { ReaderAuthService } from './reader-auth.service'
import { READER_AUTH_COOKIES } from './reader-auth.types'

@Controller('reader-auth')
export class ReaderAuthController {
  constructor(private readonly readerAuth: ReaderAuthService) {}

  @Post('request')
  @HttpCode(200)
  async request(
    @Body() dto: RequestMagicLinkDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.readerAuth.requestMagicLink(dto, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    })
    if (result.authenticated) {
      this.readerAuth.setAuthCookies(res, result)
      return {
        ok: true as const,
        authenticated: true as const,
        reader: result.reader,
        intent: result.intent,
        returnUrl: result.returnUrl,
      }
    }
    return { ok: true as const, authenticated: false as const }
  }

  @Post('verify')
  @HttpCode(200)
  async verify(
    @Body() dto: VerifyMagicLinkDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.readerAuth.verifyMagicLink(dto.token, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    })
    this.readerAuth.setAuthCookies(res, result)
    return {
      reader: result.reader,
      intent: result.intent,
      returnUrl: result.returnUrl,
    }
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[READER_AUTH_COOKIES.refresh] as
      | string
      | undefined
    const result = await this.readerAuth.refresh(refreshToken ?? '', {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    })
    this.readerAuth.setAuthCookies(res, result)
    return { reader: result.reader }
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.readerAuth.logout(
      req.cookies?.[READER_AUTH_COOKIES.access] as string | undefined,
      req.cookies?.[READER_AUTH_COOKIES.refresh] as string | undefined,
    )
    this.readerAuth.clearAuthCookies(res)
    return { ok: true }
  }
}
