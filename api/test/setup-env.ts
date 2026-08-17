import { loadTestEnv } from './load-test-env';

/** Runs before test files import AppModule (ConfigModule validates on import). */
loadTestEnv();
