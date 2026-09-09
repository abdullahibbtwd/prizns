/** Mock completed donations for CMS chart UI — swap for API later. */

export type DonationChartGranularity = 'day' | 'month' | 'year'

export type DonationChartPoint = {
  key: string
  label: string
  amountBgn: number
}

function seeded(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/** ~14 months of daily completed donation totals (лв). */
function buildMockDailySeries(now = new Date()): Array<{ date: Date; amountBgn: number }> {
  const points: Array<{ date: Date; amountBgn: number }> = []
  const start = new Date(now.getFullYear() - 1, now.getMonth(), 1)
  start.setHours(12, 0, 0, 0)

  const cursor = new Date(start)
  let i = 0
  while (cursor <= now) {
    const weekend = cursor.getDay() === 0 || cursor.getDay() === 6
    const base = weekend ? 18 : 42
    const wave = Math.sin(i / 11) * 28 + Math.cos(i / 5) * 12
    const noise = seeded(i + 7) * 55
    const amount = Math.max(0, Math.round(base + wave + noise))
    // Some quiet days
    const quiet = seeded(i + 99) < 0.18
    points.push({
      date: new Date(cursor),
      amountBgn: quiet ? 0 : amount,
    })
    cursor.setDate(cursor.getDate() + 1)
    i += 1
  }
  return points
}

let dailyCacheKey = ''
let dailyCache: Array<{ date: Date; amountBgn: number }> = []

function dailySeriesFor(now: Date) {
  const key = dayKey(now)
  if (key !== dailyCacheKey) {
    dailyCacheKey = key
    dailyCache = buildMockDailySeries(now)
  }
  return dailyCache
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

function yearKey(d: Date) {
  return String(d.getFullYear())
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export function getMockDonationSeries(
  granularity: DonationChartGranularity,
  now = new Date(),
): DonationChartPoint[] {
  const daily = dailySeriesFor(now)
  if (granularity === 'day') {
    // Last 30 days including today
    const start = new Date(now)
    start.setHours(12, 0, 0, 0)
    start.setDate(start.getDate() - 29)
    return daily.filter((p) => p.date >= start && p.date <= now).map((p) => ({
      key: dayKey(p.date),
      label: `${pad(p.date.getDate())} ${MONTH_LABELS[p.date.getMonth()]}`,
      amountBgn: p.amountBgn,
    }))
  }

  if (granularity === 'month') {
    const map = new Map<string, number>()
    for (const p of daily) {
      const k = monthKey(p.date)
      map.set(k, (map.get(k) ?? 0) + p.amountBgn)
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, amountBgn]) => {
        const [y, m] = key.split('-')
        return {
          key,
          label: `${MONTH_LABELS[Number(m) - 1]} ${y}`,
          amountBgn,
        }
      })
  }

  const map = new Map<string, number>()
  for (const p of daily) {
    const k = yearKey(p.date)
    map.set(k, (map.get(k) ?? 0) + p.amountBgn)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, amountBgn]) => ({
      key,
      label: key,
      amountBgn,
    }))
}

export function getMockMonthTotalBgn(now = new Date()): number {
  const prefix = monthKey(now)
  return dailySeriesFor(now)
    .filter((p) => monthKey(p.date) === prefix)
    .reduce((sum, p) => sum + p.amountBgn, 0)
}

export function getMockTodayTotalBgn(now = new Date()): number {
  const key = dayKey(now)
  return dailySeriesFor(now).find((p) => dayKey(p.date) === key)?.amountBgn ?? 0
}
