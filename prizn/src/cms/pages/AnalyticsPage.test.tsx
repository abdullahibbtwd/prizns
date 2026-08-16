import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderPage } from '@/test/render-page'
import CmsAnalyticsPage from './AnalyticsPage'

const getAnalyticsSummary = vi.fn()

vi.mock('@/lib/analytics-api', () => ({
  getAnalyticsSummary: (...args: unknown[]) => getAnalyticsSummary(...args),
}))

describe('CmsAnalyticsPage', () => {
  beforeEach(() => {
    getAnalyticsSummary.mockResolvedValue({
      range: 'today',
      visitors: 900,
      pageviews: 2400,
      avgDwellMs: 190000,
      avgDwellLabel: '3m 10s',
      totalDwellMs: 500000,
      totalDwellLabel: '8m 20s',
      loggedInSessions: 120,
      anonymousSessions: 780,
      visitorsTrendPct: 12,
      pageviewsTrendPct: -3,
      previous: {
        visitors: 800,
        pageviews: 2200,
        avgDwellMs: 180000,
        avgDwellLabel: '3m',
      },
      topPages: [{ path: '/', views: 300, avgDwellMs: 60000, avgDwellLabel: '1m' }],
      topStories: [
        {
          articleId: 'a-1',
          path: '/stories/river',
          title: 'River story',
          views: 120,
          avgDwellMs: 120000,
          avgDwellLabel: '2m',
        },
      ],
      daily: [
        { day: '2026-08-12', views: 40 },
        { day: '2026-08-13', views: 55 },
        { day: '2026-08-14', views: 48 },
      ],
      topClicks: [
        {
          href: '/support',
          clicks: 18,
          label: 'Donate',
          kind: 'cta',
        },
      ],
    })
  })

  it('shows analytics summary for the selected range', async () => {
    renderPage(<CmsAnalyticsPage />)
    expect(await screen.findByText('900')).toBeInTheDocument()
    expect(screen.getByText('River story')).toBeInTheDocument()
    expect(screen.getByText('Donate')).toBeInTheDocument()
    expect(screen.getByText('/support')).toBeInTheDocument()
  })

  it('refetches when the range changes', async () => {
    const user = userEvent.setup()
    renderPage(<CmsAnalyticsPage />)
    await screen.findByText('900')

    await user.click(screen.getByRole('button', { name: 'cms.analytics.rangeWeek' }))

    await waitFor(() => {
      expect(getAnalyticsSummary).toHaveBeenCalledWith('week')
    })
  })
})
