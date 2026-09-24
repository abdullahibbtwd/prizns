/**
 * Editorial dates for Bulgaria — always Europe/Sofia so list/editor/public match.
 */
export const EDITORIAL_TIMEZONE = 'Europe/Sofia'

function sofiaParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: EDITORIAL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  }
}

/** Calendar date in Europe/Sofia as YYYY-MM-DD (never UTC slice). */
export function toSofiaDateIso(value: string | Date | null | undefined): string {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const { year, month, day } = sofiaParts(date)
  return `${year}-${month}-${day}`
}

/** datetime-local value in Europe/Sofia. */
export function toSofiaDatetimeLocal(
  value?: string | Date | null,
  fallback = new Date(),
): string {
  const date = value ? new Date(value) : fallback
  if (Number.isNaN(date.getTime())) return ''
  const { year, month, day, hour, minute } = sofiaParts(date)
  return `${year}-${month}-${day}T${hour}:${minute}`
}

/**
 * Format a public article date for display.
 * Prefers ISO `YYYY-MM-DD` (from the API) and falls back to legacy free-text.
 */
export function formatJournalDate(
  value: string | null | undefined,
  lang: 'bg' | 'en',
): string {
  const raw = value?.trim() ?? ''
  if (!raw) return ''

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  if (!iso) return raw

  const date = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T12:00:00`)
  if (Number.isNaN(date.getTime())) return raw

  return new Intl.DateTimeFormat(lang === 'bg' ? 'bg-BG' : 'en-GB', {
    timeZone: EDITORIAL_TIMEZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/** Prefer lang-specific date fields, then format. */
export function formatArticleDate(
  lang: 'bg' | 'en',
  date: string | null | undefined,
  dateBg?: string | null,
): string {
  const preferred = lang === 'bg' ? dateBg || date : date || dateBg
  return formatJournalDate(preferred, lang)
}

/** CMS list date: original publication, never the import/updated stamp. */
export function formatCmsListDate(
  story: {
    publishedAt?: string | Date | null
    dateBg?: string | null
    date?: string | null
    updatedAt?: string | Date | null
  },
  lang: 'bg' | 'en',
): string {
  if (story.dateBg?.trim() || story.date?.trim()) {
    return formatArticleDate(lang, story.date, story.dateBg)
  }
  if (story.publishedAt) {
    return formatJournalDate(toSofiaDateIso(story.publishedAt), lang)
  }
  return ''
}
