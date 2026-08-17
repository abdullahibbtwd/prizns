import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { validateEnv } from '../../src/config/env.validation';
import { AiService } from '../../src/ai/ai.service';
import { EmbedProcessor } from '../../src/jobs/embed.processor';
import {
  QUEUE_AI,
  QUEUE_DIGEST,
  QUEUE_SOCIAL,
  QUEUE_TRANSLATE,
  QUEUE_TTS,
} from '../../src/jobs/queue.constants';
import { TranslateProcessor } from '../../src/jobs/translate.processor';
import { TtsProcessor } from '../../src/jobs/tts.processor';
import { DigestProcessor } from '../../src/jobs/digest.processor';
import { MailService } from '../../src/mail/mail.service';
import { TranslationService } from '../../src/translation/translation.service';
import { TtsService } from '../../src/tts/tts.service';
import { loadTestEnv } from '../load-test-env';

export type E2eContext = {
  app: INestApplication<App>;
  moduleFixture: TestingModule;
};

const noopProcessor = {
  process: jest.fn().mockResolvedValue(undefined),
  onFailed: jest.fn().mockResolvedValue(undefined),
};

/** Mock Resend so contact/digest/shop flows never hit the network. */
export const mockMailService = {
  isConfigured: () => true,
  send: jest.fn().mockResolvedValue({
    ids: ['e2e-email-id'],
    recipientCount: 1,
  }),
};

/** Prevent BullMQ translation workers from racing with test DB resets. */
export const mockTranslationService = {
  enqueue: jest.fn().mockResolvedValue(undefined),
  enqueueAuthor: jest.fn().mockResolvedValue(undefined),
  enqueueSeries: jest.fn().mockResolvedValue(undefined),
  bilingualFromSingle: jest.fn(async (text: string) => ({
    bg: text,
    en: text,
  })),
  markFailed: jest.fn().mockResolvedValue(undefined),
  processArticle: jest.fn().mockResolvedValue(undefined),
  processAuthor: jest.fn().mockResolvedValue(undefined),
  processSeries: jest.fn().mockResolvedValue(undefined),
};

export const mockAiService = {
  isEnabled: () => false,
  enqueueEmbed: jest.fn().mockResolvedValue(undefined),
  assertRateLimit: jest.fn(),
  processEmbed: jest.fn().mockResolvedValue(undefined),
  suggest: jest.fn().mockResolvedValue({ suggestions: [] }),
  classifyContact: jest.fn().mockResolvedValue({
    category: 'UNKNOWN',
    summary: null,
  }),
  explainRegionalContext: jest.fn().mockResolvedValue({
    promptVersion: 'e2e',
    lang: 'en',
    context: '',
  }),
  relatedByEmbedding: jest.fn().mockResolvedValue([]),
  askArchive: jest.fn().mockResolvedValue({
    refused: true,
    answer: null,
    lang: 'en',
    citations: [],
  }),
};

export const mockTtsService = {
  enqueue: jest.fn().mockResolvedValue(undefined),
  processArticle: jest.fn().mockResolvedValue(undefined),
};

let e2eEnvOverrides: Record<string, string> = {};

function createE2eConfigService(): ConfigService {
  const env = { ...process.env, ...e2eEnvOverrides };
  for (const key of [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'GEMINI_API_KEY',
    'RESEND_API_KEY',
  ]) {
    delete env[key];
  }
  const validated = validateEnv(env);
  const config = new ConfigService(validated as Record<string, unknown>);
  const originalGet = config.get.bind(config);
  config.get = ((key: string, defaultValue?: unknown) => {
    if (key in e2eEnvOverrides) {
      return e2eEnvOverrides[key];
    }
    if (
      key === 'STRIPE_SECRET_KEY' ||
      key === 'STRIPE_WEBHOOK_SECRET' ||
      key === 'GEMINI_API_KEY' ||
      key === 'RESEND_API_KEY'
    ) {
      return undefined;
    }
    return originalGet(key, defaultValue);
  }) as ConfigService['get'];
  return config;
}

const QUEUE_NAMES = [
  QUEUE_TRANSLATE,
  QUEUE_AI,
  QUEUE_TTS,
  QUEUE_SOCIAL,
  QUEUE_DIGEST,
] as const;

async function closeBullQueues(moduleFixture: TestingModule) {
  for (const name of QUEUE_NAMES) {
    try {
      const queue = moduleFixture.get(getQueueToken(name), { strict: false });
      if (queue?.pause) await queue.pause(true, true);
      if (queue?.close) await queue.close();
    } catch {
      // queue may already be closed
    }
  }
}

export async function createE2eApp(
  envOverrides: Record<string, string> = {},
): Promise<E2eContext> {
  loadTestEnv();
  e2eEnvOverrides = { ...envOverrides };
  Object.assign(process.env, envOverrides);

  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(ConfigService)
    .useFactory(createE2eConfigService)
    .overrideProvider(MailService)
    .useValue(mockMailService)
    .overrideProvider(TranslationService)
    .useValue(mockTranslationService)
    .overrideProvider(AiService)
    .useValue(mockAiService)
    .overrideProvider(TtsService)
    .useValue(mockTtsService)
    .overrideProvider(TranslateProcessor)
    .useValue(noopProcessor)
    .overrideProvider(TtsProcessor)
    .useValue(noopProcessor)
    .overrideProvider(EmbedProcessor)
    .useValue(noopProcessor)
    .overrideProvider(DigestProcessor)
    .useValue(noopProcessor)
    .compile();

  const app = moduleFixture.createNestApplication<App>({ rawBody: true });
  const prefix = process.env.API_PREFIX ?? 'api';
  app.setGlobalPrefix(prefix);
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  return { app, moduleFixture };
}

export async function closeE2eApp(ctx: E2eContext | undefined) {
  if (!ctx?.moduleFixture) return;
  await closeBullQueues(ctx.moduleFixture);
  try {
    await ctx.app.close();
  } catch {
    // Redis/BullMQ may already be closed when multiple suites tear down.
  }
  try {
    await ctx.moduleFixture.close();
  } catch {
    // ignore duplicate teardown
  }
}
