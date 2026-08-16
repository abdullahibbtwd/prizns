import {
  absoluteSiteUrl,
  BGN_PER_EUR,
  bgnToEurCents,
} from './money.util';

describe('money.util', () => {
  it('defines the official BGN/EUR rate', () => {
    expect(BGN_PER_EUR).toBe(1.95583);
  });

  it('converts BGN to Stripe EUR cents', () => {
    expect(bgnToEurCents(BGN_PER_EUR)).toBe(100);
    expect(bgnToEurCents(10)).toBe(Math.round((10 / BGN_PER_EUR) * 100));
  });

  it('builds absolute URLs with encoded paths', () => {
    const url = absoluteSiteUrl('https://prizni.bg', '/stories/тест', {
      utm: 'x',
    });
    expect(url).toContain('https://prizni.bg/');
    expect(url).toContain('utm=x');
  });
});
