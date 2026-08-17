import {
  parseGoogleServiceAccount,
  resolveGoogleClientAuth,
} from './google-credentials';

const SAMPLE = {
  type: 'service_account',
  project_id: 'prizn-tts',
  private_key: '-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n',
  client_email: 'tts@prizn-tts.iam.gserviceaccount.com',
};

describe('google credentials from env', () => {
  it('parses inline service-account JSON', () => {
    const parsed = parseGoogleServiceAccount(JSON.stringify(SAMPLE));
    expect(parsed?.client_email).toBe(SAMPLE.client_email);
    expect(parsed?.private_key).toContain('BEGIN PRIVATE KEY');
    expect(parsed?.private_key).toContain('\n');
  });

  it('parses base64 JSON', () => {
    const encoded = Buffer.from(JSON.stringify(SAMPLE), 'utf8').toString('base64');
    const parsed = parseGoogleServiceAccount(encoded);
    expect(parsed?.project_id).toBe('prizn-tts');
  });

  it('prefers GOOGLE_SERVICE_ACCOUNT_JSON over a file path', () => {
    const auth = resolveGoogleClientAuth((key) => {
      if (key === 'GOOGLE_SERVICE_ACCOUNT_JSON') return JSON.stringify(SAMPLE);
      if (key === 'GOOGLE_APPLICATION_CREDENTIALS') return '/missing/path.json';
      if (key === 'GOOGLE_CLOUD_PROJECT') return 'override-project';
      return undefined;
    });
    expect(auth).toEqual({
      credentials: {
        client_email: SAMPLE.client_email,
        private_key: expect.stringContaining('BEGIN PRIVATE KEY'),
      },
      projectId: 'override-project',
    });
  });

  it('treats GOOGLE_APPLICATION_CREDENTIALS as JSON when it is not a path', () => {
    const auth = resolveGoogleClientAuth((key) => {
      if (key === 'GOOGLE_APPLICATION_CREDENTIALS') return JSON.stringify(SAMPLE);
      return undefined;
    });
    expect(auth && 'credentials' in auth).toBe(true);
  });

  it('returns null for empty or invalid values', () => {
    expect(parseGoogleServiceAccount('')).toBeNull();
    expect(parseGoogleServiceAccount('not-json')).toBeNull();
  });
});
