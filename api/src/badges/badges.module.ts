import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { BadgesCmsController } from './badges.controller'
import { BadgesService } from './badges.service'

@Module({
  imports: [AuthModule],
  controllers: [BadgesCmsController],
  providers: [BadgesService],
  exports: [BadgesService],
})
export class BadgesModule {}
