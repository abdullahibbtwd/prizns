import { existsSync } from 'fs';
import { isAbsolute, resolve } from 'path';

export type GoogleServiceAccount = {
  type?: string;
  project_id?: string;
  private_key?: string;
  client_email?: string;
};

export type GoogleClientAuth =
  | {
      credentials: { client_email: string; private_key: string };
      projectId?: string;
    }
  | {
      keyFilename: string;
      projectId?: string;
    };

function looksLikeJson(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith('{') && trimmed.includes('private_key');
}

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Parse a service-account JSON string from env (raw JSON, quoted JSON, or base64).
 */
export function parseGoogleServiceAccount(
  raw: string | undefined,
): GoogleServiceAccount | null {
  if (!raw?.trim()) return null;
  let text = raw.trim();
  if (
    (text.startsWith("'") && text.endsWith("'")) ||
    (text.startsWith('"') && text.endsWith('"'))
  ) {
    text = text.slice(1, -1);
  }

  let parsed = looksLikeJson(text) ? tryParseJson(text) : null;

  if (!parsed && !text.startsWith('{')) {
    try {
      const decoded = Buffer.from(text, 'base64').toString('utf8');
      if (looksLikeJson(decoded)) parsed = tryParseJson(decoded);
    } catch {
      parsed = null;
    }
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const record = parsed as GoogleServiceAccount;
  if (!record.client_email || !record.private_key) return null;

  return {
    ...record,
    private_key: record.private_key.replace(/\\n/g, '\n'),
  };
}

function fromAccount(
  account: GoogleServiceAccount,
  projectId?: string,
): GoogleClientAuth {
  return {
    credentials: {
      client_email: account.client_email!,
      private_key: account.private_key!,
    },
    projectId: projectId || account.project_id,
  };
}

function resolveCredentialsFile(configured: string): string | null {
  const candidates: string[] = [];
  if (configured) {
    candidates.push(
      isAbsolute(configured) ? configured : resolve(process.cwd(), configured),
    );
    if (configured.startsWith('/app/')) {
      candidates.push(resolve(process.cwd(), '..', configured.slice(5)));
      candidates.push(resolve(process.cwd(), configured.slice(5)));
    }
  }
  candidates.push(
    resolve(process.cwd(), '../secrets/google-service-account.json'),
    resolve(process.cwd(), 'secrets/google-service-account.json'),
  );
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  return null;
}

export function resolveGoogleClientAuth(getEnv: (key: string) => string | undefined): GoogleClientAuth | null {
  const projectId = getEnv('GOOGLE_CLOUD_PROJECT')?.trim() || undefined;

  const inline = parseGoogleServiceAccount(getEnv('GOOGLE_SERVICE_ACCOUNT_JSON'));
  if (inline) return fromAccount(inline, projectId);

  const credentialsVar = getEnv('GOOGLE_APPLICATION_CREDENTIALS')?.trim() || '';
  if (credentialsVar) {
    const fromPathVar = parseGoogleServiceAccount(credentialsVar);
    if (fromPathVar) return fromAccount(fromPathVar, projectId);
    const keyFilename = resolveCredentialsFile(credentialsVar);
    if (keyFilename) return { keyFilename, projectId };
  } else {
    const keyFilename = resolveCredentialsFile('');
    if (keyFilename) return { keyFilename, projectId };
  }

  return null;
}
