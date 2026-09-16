import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from 'fs/promises';
import { basename, dirname, join } from 'path';
import {
  assertRedirectMapReady,
  countNginxMapEntries,
  type RedirectMapWriteGuard,
} from './nginx-legacy-redirects';

const RETRYABLE_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'EPIPE',
  'ENOTFOUND',
  'EAI_AGAIN',
  'P1001',
  'P1002',
  'P1017',
  'P2024',
  '57P01',
  '08006',
]);

export function isRetryableError(error: unknown): boolean {
  let current: unknown = error;
  for (let i = 0; i < 4 && current; i += 1) {
    if (current && typeof current === 'object') {
      const record = current as { code?: string; message?: string };
      if (record.code && RETRYABLE_CODES.has(String(record.code))) {
        return true;
      }
      const message = String(record.message ?? '');
      if (
        /timeout|timed out|connection (terminated|reset|refused)|can't reach database|server closed the connection/i.test(
          message,
        )
      ) {
        return true;
      }
    }
    current =
      current instanceof Error && 'cause' in current ? current.cause : undefined;
  }
  return false;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: {
    retries?: number;
    delayMs?: number;
    label?: string;
    onRetry?: (attempt: number, waitMs: number, error: unknown) => void;
  },
): Promise<T> {
  const retries = Math.max(1, opts?.retries ?? 5);
  const delayMs = Math.max(0, opts?.delayMs ?? 1000);
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries || !isRetryableError(error)) {
        throw error;
      }
      const waitMs = delayMs * 2 ** (attempt - 1);
      opts?.onRetry?.(attempt, waitMs, error);
      await sleep(waitMs);
    }
  }
  throw lastError;
}

export function backupStamp(now = new Date()): string {
  return now.toISOString().replace(/[-:]/g, '').replace('.', '')
    .replace('Z', '') + 'Z';
}

export async function pruneBackups(
  filePath: string,
  keep: number,
): Promise<void> {
  if (keep < 0) return;
  const prefix = `${basename(filePath)}.bak.`;
  const dir = dirname(filePath);
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return;
  }
  const backups = names.filter((name) => name.startsWith(prefix)).sort()
    .reverse();
  for (const extra of backups.slice(keep)) {
    await unlink(join(dir, extra)).catch(() => undefined);
  }
}

export async function backupExistingFile(
  filePath: string,
  keep = 5,
): Promise<string | null> {
  let previous: string;
  try {
    previous = await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
  const backupPath = `${filePath}.bak.${backupStamp()}`;
  await copyFile(filePath, backupPath);
  await pruneBackups(filePath, keep);
  return previous;
}

export async function writeMapAtomically(
  filePath: string,
  body: string,
  guard: RedirectMapWriteGuard & { keepBackups?: number } = {},
): Promise<{ backupPath: string | null; previousLineCount: number }> {
  const previous = await readFile(filePath, 'utf8').catch(() => '');
  const previousLineCount = previous ? countNginxMapEntries(previous) : 0;
  assertRedirectMapReady(
    countNginxMapEntries(body),
    previous ? previousLineCount : undefined,
    guard,
  );

  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });
  const tmpPath = `${filePath}.tmp.${process.pid}`;
  try {
    const backupPath = previous
      ? `${filePath}.bak.${backupStamp()}`
      : null;
    if (backupPath) {
      await copyFile(filePath, backupPath);
      await pruneBackups(filePath, guard.keepBackups ?? 5);
    }
    await writeFile(tmpPath, body, 'utf8');
    await rename(tmpPath, filePath);
    return { backupPath, previousLineCount };
  } catch (error) {
    await unlink(tmpPath).catch(() => undefined);
    throw error;
  }
}
