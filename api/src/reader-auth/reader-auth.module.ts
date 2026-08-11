import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { MailModule } from '../mail/mail.module'
import { CurrentReader } from './decorators/current-reader.decorator'
import { ReaderJwtAuthGuard } from './guards/reader-jwt-auth.guard'
import { ReaderAuthController } from './reader-auth.controller'
import { ReaderAuthService } from './reader-auth.service'

@Module({
  imports: [
    MailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [ReaderAuthController],
  providers: [ReaderAuthService, ReaderJwtAuthGuard],
  exports: [ReaderAuthService, ReaderJwtAuthGuard],
})
export class ReaderAuthModule {}

export { CurrentReader }
