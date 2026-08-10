import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ShopModule } from '../shop/shop.module';
import { DonationsController } from './donations.controller';
import { DonationsService } from './donations.service';
import { PublicDonationsController } from './public-donations.controller';

@Module({
  imports: [AuthModule, forwardRef(() => ShopModule)],
  controllers: [PublicDonationsController, DonationsController],
  providers: [DonationsService],
  exports: [DonationsService],
})
export class DonationsModule {}
