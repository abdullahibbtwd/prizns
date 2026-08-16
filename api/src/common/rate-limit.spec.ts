import { checkRateLimit, resetRateLimits } from './rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => resetRateLimits('test'));

  it('allows requests within the limit', () => {
    expect(checkRateLimit('test', 'a', 2, 60_000)).toBe(true);
    expect(checkRateLimit('test', 'a', 2, 60_000)).toBe(true);
  });

  it('blocks requests over the limit', () => {
    expect(checkRateLimit('test', 'b', 1, 60_000)).toBe(true);
    expect(checkRateLimit('test', 'b', 1, 60_000)).toBe(false);
  });
});
