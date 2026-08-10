import { randomBytes } from 'crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Short public order code, e.g. PRZ-A3K9M2QX */
export function generateOrderPublicId(prefix = 'PRZ'): string {
  const bytes = randomBytes(6);
  let body = '';
  for (let i = 0; i < bytes.length; i += 1) {
    body += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return `${prefix}-${body}`;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Timing-safe-ish equality for emails / public ids (same length check first). */
export function safeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export function maskEmail(email: string): string {
  const normalized = normalizeEmail(email);
  const [user, domain] = normalized.split('@');
  if (!user || !domain) return '***';
  const visible = user.slice(0, Math.min(2, user.length));
  return `${visible}***@${domain}`;
}

export type ArrivalDayType = 'BUSINESS' | 'CALENDAR';

export function formatEstimatedArrivalLabel(
  minDays: number,
  maxDays: number,
  dayType: ArrivalDayType,
  lang: 'bg' | 'en',
): string {
  const min = Math.min(minDays, maxDays);
  const max = Math.max(minDays, maxDays);
  const range = min === max ? String(min) : `${min}–${max}`;
  if (lang === 'bg') {
    return dayType === 'BUSINESS' ? `${range} работни дни` : `${range} дни`;
  }
  return dayType === 'BUSINESS' ? `${range} business days` : `${range} days`;
}

/** Normalize min/max/dayType into stored fields + display strings. */
export function buildEstimatedArrivalFields(input: {
  minDays?: number | null;
  maxDays?: number | null;
  dayType?: ArrivalDayType | null;
}): {
  estimatedArrivalMinDays: number | null;
  estimatedArrivalMaxDays: number | null;
  estimatedArrivalDayType: ArrivalDayType | null;
  estimatedArrivalBg: string;
  estimatedArrivalEn: string | null;
} {
  const minRaw = input.minDays ?? null;
  const maxRaw = input.maxDays ?? null;
  const dayType = input.dayType ?? null;
  if (minRaw == null || maxRaw == null || !dayType) {
    return {
      estimatedArrivalMinDays: null,
      estimatedArrivalMaxDays: null,
      estimatedArrivalDayType: null,
      estimatedArrivalBg: '',
      estimatedArrivalEn: null,
    };
  }
  const min = Math.min(minRaw, maxRaw);
  const max = Math.max(minRaw, maxRaw);
  return {
    estimatedArrivalMinDays: min,
    estimatedArrivalMaxDays: max,
    estimatedArrivalDayType: dayType,
    estimatedArrivalBg: formatEstimatedArrivalLabel(min, max, dayType, 'bg'),
    estimatedArrivalEn: formatEstimatedArrivalLabel(min, max, dayType, 'en'),
  };
}
