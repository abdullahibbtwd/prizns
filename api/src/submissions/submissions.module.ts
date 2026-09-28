import { Module } from '@nestjs/common';
import { ArticlesModule } from '../articles/articles.module';
import { AuthModule } from '../auth/auth.module';
import { AuthorsModule } from '../authors/authors.module';
import { MailModule } from '../mail/mail.module';
import { StorageModule } from '../storage/storage.module';
import { PublicSubmissionsController } from './public-submissions.controller';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';

@Module({
  imports: [AuthModule, AuthorsModule, StorageModule, ArticlesModule, MailModule],
  controllers: [PublicSubmissionsController, SubmissionsController],
  providers: [SubmissionsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
