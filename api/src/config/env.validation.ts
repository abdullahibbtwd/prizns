import { plainToInstance } from 'class-transformer';
import {
  IsBooleanString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  API_PORT!: number;

  @IsOptional()
  @IsString()
  API_PREFIX?: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  REDIS_HOST!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT!: number;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  @IsString()
  @IsNotEmpty()
  MINIO_ENDPOINT!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  MINIO_PORT!: number;

  @IsString()
  @IsNotEmpty()
  MINIO_ACCESS_KEY!: string;

  @IsString()
  @IsNotEmpty()
  MINIO_SECRET_KEY!: string;

  @IsString()
  @IsNotEmpty()
  MINIO_BUCKET!: string;

  @IsOptional()
  @IsBooleanString()
  MINIO_USE_SSL?: string;

  /** Full URL (http://…) or same-origin path (/media) proxied by nginx. */
  @IsOptional()
  @IsString()
  @Matches(/^(https?:\/\/[^\s]+|\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]*)$/, {
    message:
      'MINIO_PUBLIC_URL must be a URL (https://…) or a public path like /media',
  })
  MINIO_PUBLIC_URL?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET!: string;

  @IsOptional()
  @IsInt()
  @Min(60)
  JWT_ACCESS_TTL_SECONDS?: number;

  @IsOptional()
  @IsInt()
  @Min(60)
  JWT_REFRESH_TTL_SECONDS?: number;

  @IsOptional()
  @IsBooleanString()
  COOKIE_SECURE?: string;

  @IsOptional()
  @IsString()
  ADMIN_EMAIL?: string;

  @IsOptional()
  @IsString()
  ADMIN_PASSWORD?: string;

  @IsOptional()
  @IsString()
  ADMIN_NAME?: string;

  @IsOptional()
  @IsBooleanString()
  SEED_ON_BOOT?: string;

  @IsOptional()
  @IsString()
  GOOGLE_CLOUD_PROJECT?: string;

  @IsOptional()
  @IsString()
  GOOGLE_APPLICATION_CREDENTIALS?: string;

  /** Public site origin for sitemap, canonicals, Stripe redirects. */
  @IsOptional()
  @IsString()
  PUBLIC_SITE_URL?: string;

  @IsOptional()
  @IsString()
  STRIPE_SECRET_KEY?: string;

  @IsOptional()
  @IsString()
  STRIPE_WEBHOOK_SECRET?: string;

  @IsOptional()
  @IsString()
  STRIPE_CURRENCY?: string;

  @IsOptional()
  @IsString()
  GEMINI_API_KEY?: string;

  @IsOptional()
  @IsString()
  GEMINI_MODEL?: string;

  @IsOptional()
  @IsString()
  GEMINI_EMBEDDING_MODEL?: string;

  @IsOptional()
  @IsBooleanString()
  FEATURE_AI?: string;

  @IsOptional()
  @IsBooleanString()
  FEATURE_TTS?: string;

  @IsOptional()
  @IsBooleanString()
  FEATURE_SOCIAL?: string;

  @IsOptional()
  @IsBooleanString()
  FEATURE_DIGEST?: string;

  @IsOptional()
  @IsBooleanString()
  FEATURE_SHOP?: string;

  @IsOptional()
  @IsBooleanString()
  FEATURE_READER_AUTH?: string;

  @IsOptional()
  @IsString()
  TTS_LANGUAGE_CODE?: string;

  @IsOptional()
  @IsString()
  TTS_VOICE_NAME?: string;

  @IsOptional()
  @IsString()
  RESEND_API_KEY?: string;

  @IsOptional()
  @IsString()
  RESEND_FROM?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const normalized = { ...config };
  // Coolify often injects empty strings for optional vars — treat as unset.
  for (const key of Object.keys(normalized)) {
    if (normalized[key] === '') delete normalized[key];
  }

  const validated = plainToInstance(EnvironmentVariables, normalized, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors
        .map((e) => Object.values(e.constraints ?? {}).join(', '))
        .join('\n')}`,
    );
  }

  assertProductionSecurity(validated);

  return validated;
}

function assertProductionSecurity(env: EnvironmentVariables) {
  if (env.NODE_ENV !== 'production') return;

  if ((env.JWT_ACCESS_SECRET?.length ?? 0) < 32) {
    throw new Error(
      'JWT_ACCESS_SECRET must be at least 32 characters in production.',
    );
  }
  if ((env.JWT_REFRESH_SECRET?.length ?? 0) < 32) {
    throw new Error(
      'JWT_REFRESH_SECRET must be at least 32 characters in production.',
    );
  }
  if (!env.CORS_ORIGIN?.trim()) {
    throw new Error('CORS_ORIGIN must be set in production.');
  }
  if (usesHttpsOrigins(env)) {
    if (env.COOKIE_SECURE !== 'true') {
      throw new Error(
        'COOKIE_SECURE must be true in production when CORS_ORIGIN or PUBLIC_SITE_URL uses HTTPS.',
      );
    }
  } else if (env.COOKIE_SECURE !== 'false') {
    throw new Error(
      'COOKIE_SECURE must be false when serving over HTTP (browsers will not send Secure cookies to http:// IP or hostname). Use HTTPS, or set COOKIE_SECURE=false with an http:// CORS_ORIGIN.',
    );
  }
  if (env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.length < 16) {
    throw new Error('ADMIN_PASSWORD must be at least 16 characters in production.');
  }
}

function usesHttpsOrigins(env: EnvironmentVariables): boolean {
  return [env.CORS_ORIGIN, env.PUBLIC_SITE_URL]
    .filter((value): value is string => Boolean(value?.trim()))
    .flatMap((value) => value.split(',').map((part) => part.trim()))
    .filter(Boolean)
    .some((origin) => /^https:\/\//i.test(origin));
}
