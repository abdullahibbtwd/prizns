import { describe, expect, it } from 'vitest'
import {
  getMockDonationSeries,
  getMockMonthTotalBgn,
  getMockTodayTotalBgn,
} from './donation-chart-mock'

describe('donation chart mock', () => {
  const now = new Date('2026-08-14T12:00:00')

  it('returns 30 daily points', () => {
    const series = getMockDonationSeries('day', now)
    expect(series.length).toBeGreaterThanOrEqual(28)
    expect(series.length).toBeLessThanOrEqual(31)
    expect(series[0]?.key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(series.every((p) => p.amountBgn >= 0)).toBe(true)
  })

  it('aggregates the last 12 months', () => {
    const series = getMockDonationSeries('month', now)
    expect(series.length).toBeGreaterThan(0)
    expect(series.length).toBeLessThanOrEqual(12)
    expect(series.at(-1)?.key).toBe('2026-08')
  })

  it('aggregates by year', () => {
    const series = getMockDonationSeries('year', now)
    expect(series.some((p) => p.key === '2026')).toBe(true)
  })

  it('computes today and month totals', () => {
    expect(getMockTodayTotalBgn(now)).toBeGreaterThanOrEqual(0)
    expect(getMockMonthTotalBgn(now)).toBeGreaterThanOrEqual(
      getMockTodayTotalBgn(now),
    )
  })
})
