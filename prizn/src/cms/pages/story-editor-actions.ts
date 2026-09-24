import type { ArticleStatus } from '@/lib/cms-types'
import { toSofiaDatetimeLocal } from '@/lib/format-date'

export type EditorSaveAction = Extract<
  ArticleStatus,
  'DRAFT' | 'REVIEW' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED'
>

export function toDatetimeLocalValue(
  iso?: string | null,
  now = new Date(),
): string {
  return toSofiaDatetimeLocal(iso, now)
}

export function defaultScheduleLocal(now = new Date()): string {
  return toSofiaDatetimeLocal(null, new Date(now.getTime() + 60 * 60 * 1000))
}

export function splitDatetimeLocal(value: string): { date: string; time: string } {
  const [date = '', time = ''] = value.split('T')
  return { date, time: time.slice(0, 5) }
}

export function joinDatetimeLocal(date: string, time: string): string {
  if (!date) return ''
  return `${date}T${time || '09:00'}`
}

/**
 * Interpret datetime-local as Europe/Sofia wall time and store UTC ISO.
 * Avoids browser-local TZ drift for editors outside Sofia.
 */
export function publishedAtPayload(
  status: ArticleStatus,
  scheduledAt: string,
): string | undefined {
  if (status !== 'SCHEDULED' || !scheduledAt.trim()) return undefined
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(scheduledAt.trim())
  if (!match) return undefined
  const [, y, mo, d, h, mi] = match
  const asUtc = new Date(`${y}-${mo}-${d}T${h}:${mi}:00.000Z`)
  if (Number.isNaN(asUtc.getTime())) return undefined
  const sofiaAsIfLocal = new Date(
    asUtc.toLocaleString('en-US', { timeZone: 'Europe/Sofia' }),
  )
  const utcAsIfLocal = new Date(
    asUtc.toLocaleString('en-US', { timeZone: 'UTC' }),
  )
  const offsetMs = sofiaAsIfLocal.getTime() - utcAsIfLocal.getTime()
  return new Date(asUtc.getTime() - offsetMs).toISOString()
}

export function isScheduleDueNow(scheduledAt: string, now = new Date()): boolean {
  const iso = publishedAtPayload('SCHEDULED', scheduledAt)
  if (!iso) return false
  const date = new Date(iso)
  return !Number.isNaN(date.getTime()) && date.getTime() <= now.getTime()
}

export function editorActionDisabled(opts: {
  action: EditorSaveAction
  savedStatus?: ArticleStatus
  selectedStatus: ArticleStatus
  dirty: boolean
  busy: boolean
  isNew: boolean
}): boolean {
  if (opts.busy) return true
  if (opts.action === 'PUBLISHED') {
    // Live + unchanged: nothing to publish. Dirty edits can publish in one step.
    return (
      !opts.isNew &&
      opts.savedStatus === 'PUBLISHED' &&
      opts.selectedStatus === 'PUBLISHED' &&
      !opts.dirty
    )
  }
  if (opts.isNew || opts.dirty) return false
  return opts.savedStatus === opts.action
}
