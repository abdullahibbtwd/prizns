import {
  buildEstimatedArrivalFields,
  formatEstimatedArrivalLabel,
  generateOrderPublicId,
  maskEmail,
  normalizeEmail,
  safeEqualString,
} from './shop.util';

describe('shop.util', () => {
  it('generates order public ids with prefix', () => {
    expect(generateOrderPublicId()).toMatch(/^PRZ-[A-Z2-9]{6}$/);
    expect(generateOrderPublicId('TEST')).toMatch(/^TEST-[A-Z2-9]{6}$/);
  });

  it('normalizes emails', () => {
    expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com');
  });

  it('compares strings safely', () => {
    expect(safeEqualString('abc', 'abc')).toBe(true);
    expect(safeEqualString('abc', 'abd')).toBe(false);
    expect(safeEqualString('abc', 'ab')).toBe(false);
  });

  it('masks emails', () => {
    expect(maskEmail('john.doe@example.com')).toBe('jo***@example.com');
  });

  it('formats arrival labels', () => {
    expect(formatEstimatedArrivalLabel(3, 5, 'BUSINESS', 'en')).toBe(
      '3–5 business days',
    );
    expect(formatEstimatedArrivalLabel(2, 2, 'CALENDAR', 'bg')).toBe('2 дни');
  });

  it('builds estimated arrival fields', () => {
    expect(
      buildEstimatedArrivalFields({ minDays: null, maxDays: 5, dayType: 'BUSINESS' }),
    ).toEqual({
      estimatedArrivalMinDays: null,
      estimatedArrivalMaxDays: null,
      estimatedArrivalDayType: null,
      estimatedArrivalBg: '',
      estimatedArrivalEn: null,
    });

    const fields = buildEstimatedArrivalFields({
      minDays: 5,
      maxDays: 3,
      dayType: 'BUSINESS',
    });
    expect(fields.estimatedArrivalMinDays).toBe(3);
    expect(fields.estimatedArrivalMaxDays).toBe(5);
    expect(fields.estimatedArrivalBg).toContain('работни дни');
  });
});
