import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PartnershipsController } from './partnerships.controller';
import { PartnershipsService } from './partnerships.service';
import { PublicPartnershipsController } from './public-partnerships.controller';

@Module({
  imports: [AuthModule],
  controllers: [PublicPartnershipsController, PartnershipsController],
  providers: [PartnershipsService],
  exports: [PartnershipsService],
})
export class PartnershipsModule {}
