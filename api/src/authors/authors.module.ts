import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TranslationModule } from '../translation/translation.module';
import { AuthorsController } from './authors.controller';
import { AuthorsService } from './authors.service';
import { PublicAuthorsController } from './public-authors.controller';

@Module({
  imports: [AuthModule, TranslationModule],
  controllers: [AuthorsController, PublicAuthorsController],
  providers: [AuthorsService],
  exports: [AuthorsService],
})
export class AuthorsModule {}
