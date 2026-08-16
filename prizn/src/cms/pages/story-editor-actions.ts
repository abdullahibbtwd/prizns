import type { ArticleStatus } from '@/lib/cms-types'

export type EditorSaveAction = Extract<
  ArticleStatus,
  'DRAFT' | 'REVIEW' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED'
>

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function toDatetimeLocalValue(
  iso?: string | null,
  now = new Date(),
): string {
  const date = iso ? new Date(iso) : now
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function defaultScheduleLocal(now = new Date()): string {
  return toDatetimeLocalValue(null, new Date(now.getTime() + 60 * 60 * 1000))
}

export function splitDatetimeLocal(value: string): { date: string; time: string } {
  const [date = '', time = ''] = value.split('T')
  return { date, time: time.slice(0, 5) }
}

export function joinDatetimeLocal(date: string, time: string): string {
  if (!date) return ''
  return `${date}T${time || '09:00'}`
}

export function publishedAtPayload(
  status: ArticleStatus,
  scheduledAt: string,
): string | undefined {
  if (status !== 'SCHEDULED' || !scheduledAt.trim()) return undefined
  const date = new Date(scheduledAt)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}

export function isScheduleDueNow(scheduledAt: string, now = new Date()): boolean {
  const date = new Date(scheduledAt)
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
    return (
      !opts.isNew &&
      opts.savedStatus === 'PUBLISHED' &&
      opts.selectedStatus === 'PUBLISHED'
    )
  }
  if (opts.isNew || opts.dirty) return false
  return opts.savedStatus === opts.action
}
