import 'reflect-metadata';
import { validateEnv } from './env.validation';

const validConfig = {
  API_PORT: 3003,
  DATABASE_URL: 'postgresql://localhost:5432/prizn',
  REDIS_HOST: 'localhost',
  REDIS_PORT: 6379,
  MINIO_ENDPOINT: 'localhost',
  MINIO_PORT: 9000,
  MINIO_ACCESS_KEY: 'minio',
  MINIO_SECRET_KEY: 'minio123',
  MINIO_BUCKET: 'media',
  JWT_ACCESS_SECRET: 'access-secret',
  JWT_REFRESH_SECRET: 'refresh-secret',
};

describe('validateEnv', () => {
  it('accepts a valid configuration', () => {
    const result = validateEnv(validConfig);
    expect(result.API_PORT).toBe(3003);
    expect(result.DATABASE_URL).toBe(validConfig.DATABASE_URL);
  });

  it('treats empty strings as unset optional values', () => {
    const result = validateEnv({
      ...validConfig,
      GEMINI_API_KEY: '',
      FEATURE_AI: '',
    });
    expect(result.GEMINI_API_KEY).toBeUndefined();
    expect(result.FEATURE_AI).toBeUndefined();
  });

  it('throws when required values are missing', () => {
    expect(() => validateEnv({ API_PORT: 3003 })).toThrow(
      'Environment validation failed',
    );
  });

  it('requires production security settings', () => {
    expect(() =>
      validateEnv({
        ...validConfig,
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: 'short',
        COOKIE_SECURE: 'true',
        CORS_ORIGIN: 'https://prizni.bg',
      }),
    ).toThrow('JWT_ACCESS_SECRET must be at least 32 characters');
  });
});
