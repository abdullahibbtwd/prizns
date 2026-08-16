import { describe, expect, it } from 'vitest'
import {
  defaultScheduleLocal,
  editorActionDisabled,
  isScheduleDueNow,
  joinDatetimeLocal,
  publishedAtPayload,
  splitDatetimeLocal,
  toDatetimeLocalValue,
} from './story-editor-actions'

describe('story editor schedule helpers', () => {
  it('formats an ISO timestamp as a local datetime-local value', () => {
    const iso = '2026-09-01T10:30:00.000Z'
    const local = toDatetimeLocalValue(iso)
    const roundTrip = new Date(local)
    expect(roundTrip.toISOString()).toBe(new Date(iso).toISOString())
  })

  it('defaults schedule to one hour from now', () => {
    const now = new Date('2026-08-15T12:00:00')
    expect(defaultScheduleLocal(now)).toBe(toDatetimeLocalValue(null, new Date('2026-08-15T13:00:00')))
  })

  it('splits and joins date and time', () => {
    expect(splitDatetimeLocal('2026-09-01T08:15')).toEqual({
      date: '2026-09-01',
      time: '08:15',
    })
    expect(joinDatetimeLocal('2026-09-01', '08:15')).toBe('2026-09-01T08:15')
    expect(joinDatetimeLocal('2026-09-01', '')).toBe('2026-09-01T09:00')
    expect(joinDatetimeLocal('', '08:15')).toBe('')
  })

  it('only sends publishedAt when the story is scheduled', () => {
    expect(publishedAtPayload('DRAFT', '2026-09-01T08:15')).toBeUndefined()
    expect(publishedAtPayload('SCHEDULED', '')).toBeUndefined()
    expect(publishedAtPayload('SCHEDULED', '2026-09-01T08:15')).toBe(
      new Date('2026-09-01T08:15').toISOString(),
    )
  })

  it('treats a past schedule as due now', () => {
    const now = new Date('2026-08-15T12:00:00')
    expect(isScheduleDueNow('2026-08-15T11:00', now)).toBe(true)
    expect(isScheduleDueNow('2026-08-15T13:00', now)).toBe(false)
  })

  it('disables Publish when the saved story is already live and clean', () => {
    expect(
      editorActionDisabled({
        action: 'PUBLISHED',
        savedStatus: 'PUBLISHED',
        selectedStatus: 'PUBLISHED',
        dirty: false,
        busy: false,
        isNew: false,
      }),
    ).toBe(true)
  })

  it('keeps Publish available for unpublished edits', () => {
    expect(
      editorActionDisabled({
        action: 'PUBLISHED',
        savedStatus: 'PUBLISHED',
        selectedStatus: 'DRAFT',
        dirty: true,
        busy: false,
        isNew: false,
      }),
    ).toBe(false)
  })

  it('keeps Publish disabled while the saved story is still live', () => {
    expect(
      editorActionDisabled({
        action: 'PUBLISHED',
        savedStatus: 'PUBLISHED',
        selectedStatus: 'PUBLISHED',
        dirty: true,
        busy: false,
        isNew: false,
      }),
    ).toBe(true)
  })

  it('disables Save draft only when the saved status is already draft and clean', () => {
    expect(
      editorActionDisabled({
        action: 'DRAFT',
        savedStatus: 'DRAFT',
        selectedStatus: 'DRAFT',
        dirty: false,
        busy: false,
        isNew: false,
      }),
    ).toBe(true)
    expect(
      editorActionDisabled({
        action: 'DRAFT',
        savedStatus: 'PUBLISHED',
        selectedStatus: 'DRAFT',
        dirty: false,
        busy: false,
        isNew: false,
      }),
    ).toBe(false)
  })
})
