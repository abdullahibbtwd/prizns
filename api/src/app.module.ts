import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnalyticsModule } from './analytics/analytics.module';
import { AiModule } from './ai/ai.module';
import { ArticlesModule } from './articles/articles.module';
import { AuthModule } from './auth/auth.module';
import { AuthorsModule } from './authors/authors.module';
import { validateEnv } from './config/env.validation';
import { BadgesModule } from './badges/badges.module';
import { DigestModule } from './digest/digest.module';
import { DonationsModule } from './donations/donations.module';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';
import { MailModule } from './mail/mail.module';
import { MediaModule } from './media/media.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { PartnershipsModule } from './partnerships/partnerships.module';
import { ContactModule } from './contact/contact.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReaderAuthModule } from './reader-auth/reader-auth.module';
import { ReaderModule } from './reader/reader.module';
import { RedisModule } from './redis/redis.module';
import { SeoModule } from './seo/seo.module';
import { SeriesModule } from './series/series.module';
import { ShopModule } from './shop/shop.module';
import { SocialModule } from './social/social.module';
import { StorageModule } from './storage/storage.module';
import { StoryYearModule } from './story-year/story-year.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { TagsModule } from './tags/tags.module';
import { CategoriesModule } from './categories/categories.module';
import { TodosModule } from './todos/todos.module';
import { TranslationModule } from './translation/translation.module';
import { TtsModule } from './tts/tts.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(process.cwd(), '../.env'),
        resolve(process.cwd(), '.env'),
      ],
      validate: validateEnv,
    }),
    PrismaModule,
    RedisModule,
    JobsModule,
    AuthModule,
    ReaderAuthModule,
    ReaderModule,
    BadgesModule,
    StoryYearModule,
    AuthorsModule,
    MediaModule,
    ArticlesModule,
    SeriesModule,
    TagsModule,
    CategoriesModule,
    SubmissionsModule,
    PartnershipsModule,
    ContactModule,
    NewsletterModule,
    DonationsModule,
    ShopModule,
    SeoModule,
    UsersModule,
    TodosModule,
    AnalyticsModule,
    TranslationModule,
    TtsModule,
    AiModule,
    SocialModule,
    DigestModule,
    MailModule,
    StorageModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
