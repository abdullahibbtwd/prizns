import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AnalyticsProvider, useAnalyticsMeta } from './usePageAnalytics'
import { sendAnalyticsBeacon } from '@/lib/analytics-api'
import { setCookieConsent } from '@/lib/cookie-consent'

vi.mock('@/lib/analytics-api', () => ({
  sendAnalyticsBeacon: vi.fn(),
}))

vi.mock('@/lib/reader-auth', () => ({
  useReaderAuth: () => ({ reader: null }),
}))

function MetaProbe() {
  useAnalyticsMeta({ articleId: 'art-1', title: 'Story title' })
  return <div>meta-set</div>
}

describe('AnalyticsProvider', () => {
  it('stores page meta for trackers', () => {
    render(
      <MemoryRouter initialEntries={['/stories/test']}>
        <AnalyticsProvider>
          <MetaProbe />
        </AnalyticsProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('meta-set')).toBeInTheDocument()
  })

  it('posts a beacon after consent is accepted', async () => {
    setCookieConsent('accepted')
    vi.mocked(sendAnalyticsBeacon).mockResolvedValue({
      sessionId: 'sess-1',
      pageViewId: 'pv-1',
    })

    const { AnalyticsTracker } = await import('./usePageAnalytics')
    render(
      <MemoryRouter initialEntries={['/stories/test']}>
        <AnalyticsProvider>
          <AnalyticsTracker />
        </AnalyticsProvider>
      </MemoryRouter>,
    )

    await vi.waitFor(
      () => {
        expect(sendAnalyticsBeacon).toHaveBeenCalled()
      },
      { timeout: 2000 },
    )
  })

  it('posts a click beacon for public links after consent', async () => {
    setCookieConsent('accepted')
    vi.mocked(sendAnalyticsBeacon).mockResolvedValue({
      sessionId: 'sess-1',
      pageViewId: 'pv-1',
    })

    const { AnalyticsTracker } = await import('./usePageAnalytics')
    render(
      <MemoryRouter initialEntries={['/stories/test']}>
        <AnalyticsProvider>
          <AnalyticsTracker />
          <a href="/support">Donate now</a>
        </AnalyticsProvider>
      </MemoryRouter>,
    )

    screen.getByText('Donate now').click()

    await vi.waitFor(() => {
      expect(sendAnalyticsBeacon).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'click',
          href: '/support',
          kind: 'internal',
        }),
      )
    })
  })
})
