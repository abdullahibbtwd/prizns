import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderPage } from '@/test/render-page'
import { DonationTrendChart } from './DonationTrendChart'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}))

const getCmsDonationTrend = vi.fn()

vi.mock('@/lib/donations-api', () => ({
  getCmsDonationTrend: (...args: unknown[]) => getCmsDonationTrend(...args),
}))

describe('DonationTrendChart', () => {
  it('renders trend summary and switches granularity', async () => {
    getCmsDonationTrend.mockResolvedValue({
      granularity: 'day',
      series: [{ key: '2026-08-01', label: '01 Aug', amountBgn: 10, amountCents: 1000 }],
      todayBgn: 5,
      monthBgn: 20,
      rangeBgn: 10,
      pendingRetentionDays: 7,
    })

    const user = userEvent.setup()
    renderPage(<DonationTrendChart />)

    await waitFor(() => {
      expect(screen.getByTestId('chart')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'cms.donations.months' }))
    await waitFor(() => {
      expect(getCmsDonationTrend).toHaveBeenCalledWith('month')
    })
  })
})
