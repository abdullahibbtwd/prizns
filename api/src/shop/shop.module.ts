import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { StorageModule } from '../storage/storage.module';
import { CmsShopController } from './cms-shop.controller';
import { PublicShopController } from './public-shop.controller';
import { ShopService } from './shop.service';

@Module({
  imports: [AuthModule, MailModule, StorageModule],
  controllers: [PublicShopController, CmsShopController],
  providers: [ShopService],
  exports: [ShopService],
})
export class ShopModule {}
