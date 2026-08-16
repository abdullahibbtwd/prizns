import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderPage } from '@/test/render-page'
import CmsDonationsPage from './DonationsPage'

vi.mock('@/cms/components/DonationTrendChart', () => ({
  DonationTrendChart: () => <div data-testid="donation-chart" />,
}))

const listCmsDonations = vi.fn()

vi.mock('@/lib/donations-api', () => ({
  listCmsDonations: (...args: unknown[]) => listCmsDonations(...args),
  getCmsDonationTrend: vi.fn(),
}))

describe('CmsDonationsPage', () => {
  it('shows loading then populated donations', async () => {
    listCmsDonations.mockResolvedValue({
      items: [
        {
          id: 'don-1',
          amountCents: 2500,
          currency: 'eur',
          status: 'COMPLETED',
          email: 'donor@example.com',
          createdAt: '2026-08-01T10:00:00.000Z',
          article: {
            path: '/stories/test',
            titleEn: 'Story title',
            titleBg: 'Заглавие',
          },
        },
      ],
      total: 1,
    })

    renderPage(<CmsDonationsPage />)
    expect(screen.getByTestId('donation-chart')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Story title')).toBeInTheDocument()
    })
    expect(screen.getByText(/25\.00/)).toBeInTheDocument()
    expect(screen.getByText('EUR')).toBeInTheDocument()
  })

  it('shows empty state', async () => {
    listCmsDonations.mockResolvedValue({ items: [], total: 0 })
    renderPage(<CmsDonationsPage />)
    expect(await screen.findByText('cms.donations.empty')).toBeInTheDocument()
  })

  it('shows error state', async () => {
    listCmsDonations.mockRejectedValue(new Error('Network down'))
    renderPage(<CmsDonationsPage />)
    expect(await screen.findByText(/Network down/)).toBeInTheDocument()
  })
})
