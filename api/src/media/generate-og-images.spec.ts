import { formatSummary, type OgBackfillCounters } from './generate-og-images';

describe('generate-og-images helpers', () => {
  it('formats dry-run and apply summaries', () => {
    const counters: OgBackfillCounters = {
      found: 1000,
      generated: 920,
      skipped: 70,
      failed: 10,
      wouldGenerate: 930,
    };
    expect(formatSummary(counters, true)).toContain('Would generate: 930');
    expect(formatSummary(counters, false)).toContain('Generated:      920');
    expect(formatSummary(counters, false)).toContain('Failed:         10');
  });
});
