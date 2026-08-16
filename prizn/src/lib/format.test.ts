import { describe, expect, it } from 'vitest'
import { formatDuration, formatPath, formatTrendPct } from './format'

describe('formatDuration', () => {
  it('formats seconds only', () => {
    expect(formatDuration(45_000)).toBe('45s')
  })

  it('formats minutes and seconds', () => {
    expect(formatDuration(65_000)).toBe('1m 5s')
  })

  it('formats hours and minutes', () => {
    expect(formatDuration(3_900_000)).toBe('1h 5m')
  })

  it('formats hours without minutes when exact', () => {
    expect(formatDuration(3_600_000)).toBe('1h')
  })
})

describe('formatTrendPct', () => {
  it('adds sign for positive values', () => {
    expect(formatTrendPct(12)).toBe('+12%')
  })

  it('shows negative values as-is', () => {
    expect(formatTrendPct(-3)).toBe('-3%')
  })

  it('shows zero without sign', () => {
    expect(formatTrendPct(0)).toBe('0%')
  })
})

describe('formatPath', () => {
  it('decodes URI-encoded paths', () => {
    expect(formatPath('/stories/%D0%B8%D1%81%D1%82%D0%BE%D1%80%D0%B8%D1%8F')).toBe(
      '/stories/история',
    )
  })

  it('returns original path when decode fails', () => {
    expect(formatPath('%E0%A4%A')).toBe('%E0%A4%A')
  })
})
