import { looksMidWordTruncated } from './slug-truncation';

describe('looksMidWordTruncated', () => {
  it('flags old mid-word cuts of long titles', () => {
    const ideal =
      'kratka-istoriya-za-dunava-i-horata-koito-zhiveyat-po-negoviya-bryag-i-oshte';
    const cut = ideal.slice(0, 70);
    expect(looksMidWordTruncated(cut, ideal)).toBe(true);
  });

  it('ignores already-good slugs', () => {
    expect(looksMidWordTruncated('vratsa', 'vratsa')).toBe(false);
    expect(
      looksMidWordTruncated('kratka-istoriya', 'kratka-istoriya-za-dunava'),
    ).toBe(false);
  });
});
