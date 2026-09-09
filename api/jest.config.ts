import type { Config } from 'jest';

const coverageCollect = [
  '**/*.(t|j)s',
  '!**/*.spec.ts',
  '!**/*.js',
  '!**/main.ts',
  '!**/*.module.ts',
  '!**/*.dto.ts',
  '!**/*.types.ts',
  '!**/dto/**',
  '!**/processors/**',
  '!**/wordpress-import/import-wordpress.ts',
];

/** MinIO → query-string still CJS; decode-uri-component@0.5.0 is ESM-only. */
const decodeUriComponentMapper = {
  '^decode-uri-component$': '<rootDir>/../test/shims/decode-uri-component.cjs',
}

const config: Config = {
  projects: [
    {
      displayName: 'unit',
      moduleFileExtensions: ['js', 'json', 'ts'],
      rootDir: 'src',
      testRegex: '.*\\.spec\\.ts$',
      transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
      },
      moduleNameMapper: decodeUriComponentMapper,
      testEnvironment: 'node',
      collectCoverage: true,
      collectCoverageFrom: coverageCollect,
    },
    {
      displayName: 'e2e',
      moduleFileExtensions: ['js', 'json', 'ts'],
      rootDir: 'test',
      testRegex: '.e2e-spec.ts$',
      transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
      },
      moduleNameMapper: {
        '^decode-uri-component$': '<rootDir>/shims/decode-uri-component.cjs',
      },
      testEnvironment: 'node',
      globalSetup: '<rootDir>/global-setup.ts',
      globalTeardown: '<rootDir>/global-teardown.ts',
      setupFiles: ['<rootDir>/setup-env.ts'],
      setupFilesAfterEnv: ['<rootDir>/setup-e2e.ts'],
      testTimeout: 60000,
      maxWorkers: 1,
      collectCoverage: true,
      collectCoverageFrom: [
        '<rootDir>/../src/**/*.(t|j)s',
        '!<rootDir>/../src/**/*.spec.ts',
        '!<rootDir>/../src/**/*.js',
        '!<rootDir>/../src/**/main.ts',
        '!<rootDir>/../src/**/*.module.ts',
        '!<rootDir>/../src/**/*.dto.ts',
        '!<rootDir>/../src/**/*.types.ts',
        '!<rootDir>/../src/**/dto/**',
        '!<rootDir>/../src/**/processors/**',
        '!<rootDir>/../src/**/wordpress-import/import-wordpress.ts',
      ],
    },
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text-summary', 'lcov', 'text'],
  coverageThreshold: {
    global: {
      statements: 70,
      lines: 70,
      functions: 65,
      branches: 45,
    },
  },
  forceExit: true,
};

export default config;
