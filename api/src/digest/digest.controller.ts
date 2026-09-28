import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { STAFF_ROLES } from '../auth/role-access'
import { SendDigestDto } from './dto/send-digest.dto'
import { DigestService } from './digest.service'

@Controller('cms/digest')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...STAFF_ROLES)
export class DigestController {
  constructor(private readonly digest: DigestService) {}

  @Get('preview')
  preview(@Query('seriesId') seriesId?: string) {
    return this.digest.preview(seriesId)
  }

  @Get('history')
  history() {
    return this.digest.history()
  }

  @Post('send')
  send(@Body() dto: SendDigestDto) {
    return this.digest.sendNow(dto)
  }
}
