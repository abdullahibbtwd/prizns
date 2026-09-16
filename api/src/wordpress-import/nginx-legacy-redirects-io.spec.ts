import { mkdtemp, readFile, readdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  backupExistingFile,
  isRetryableError,
  pruneBackups,
  withRetry,
  writeMapAtomically,
} from './nginx-legacy-redirects-io';

function mapBody(count: number): string {
  const lines = Array.from({ length: count }, (_, i) => `/slug-${i} /stories/slug-${i};`);
  return `# header\n${lines.join('\n')}\n`;
}

describe('isRetryableError', () => {
  it('retries connection and prisma timeout codes', () => {
    expect(isRetryableError({ code: 'ECONNRESET' })).toBe(true);
    expect(isRetryableError({ code: 'P2024' })).toBe(true);
    expect(isRetryableError(new Error("Can't reach database server"))).toBe(true);
  });

  it('does not retry validation errors', () => {
    expect(isRetryableError(new Error('refusing to write 0 redirect lines'))).toBe(
      false,
    );
  });
});

describe('withRetry', () => {
  it('returns after transient failures', async () => {
    let calls = 0;
    const value = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) {
          const error = new Error('timeout');
          (error as Error & { code: string }).code = 'ETIMEDOUT';
          throw error;
        }
        return 'ok';
      },
      { retries: 5, delayMs: 0 },
    );
    expect(value).toBe('ok');
    expect(calls).toBe(3);
  });

  it('throws immediately for non-retryable errors', async () => {
    await expect(
      withRetry(async () => {
        throw new Error('refusing to shrink the map');
      }, { retries: 5, delayMs: 0 }),
    ).rejects.toThrow('refusing to shrink');
  });
});

describe('writeMapAtomically', () => {
  it('backs up the previous map and replaces it', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'redirects-'));
    const filePath = join(dir, 'redirects.map');
    await writeFile(filePath, mapBody(10));

    const result = await writeMapAtomically(filePath, mapBody(12), {
      keepBackups: 5,
    });
    expect(result.previousLineCount).toBe(10);
    expect(result.backupPath).toContain('.bak.');
    expect(await readFile(filePath, 'utf8')).toContain('/slug-11 /stories/slug-11;');
    expect(await readFile(result.backupPath!, 'utf8')).toContain(
      '/slug-9 /stories/slug-9;',
    );
  });

  it('leaves the current map in place when the new map shrinks too far', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'redirects-'));
    const filePath = join(dir, 'redirects.map');
    const previous = mapBody(10);
    await writeFile(filePath, previous);

    await expect(
      writeMapAtomically(filePath, mapBody(2)),
    ).rejects.toThrow('refusing to shrink');
    expect(await readFile(filePath, 'utf8')).toBe(previous);
  });

  it('prunes old backups', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'redirects-'));
    const filePath = join(dir, 'redirects.map');
    await writeFile(filePath, mapBody(4));
    await backupExistingFile(filePath, 1);
    await new Promise((resolveWait) => setTimeout(resolveWait, 5));
    await backupExistingFile(filePath, 1);
    await pruneBackups(filePath, 1);
    const files = await readdir(dir);
    expect(files.filter((name) => name.includes('.bak.')).length).toBe(1);
  });
});
