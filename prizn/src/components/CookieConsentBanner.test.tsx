import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { CookieConsentBanner } from './CookieConsentBanner'
import { setCookieConsent } from '@/lib/cookie-consent'

vi.mock('@/hooks/useJournalLang', () => ({
  useJournalLang: () => ({ lang: 'en', setLang: vi.fn() }),
}))

describe('CookieConsentBanner', () => {
  it('does not show on CMS routes', () => {
    render(
      <MemoryRouter initialEntries={['/cms/login']}>
        <CookieConsentBanner />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('appears on public pages and records accept', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/stories']}>
        <CookieConsentBanner />
      </MemoryRouter>,
    )

    const dialog = await screen.findByRole('dialog', { name: 'Cookies' })
    expect(dialog).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Accept' }))
    await waitFor(
      () => {
        expect(localStorage.getItem('prizni-cookie-consent')).toBe('accepted')
      },
      { timeout: 1500 },
    )
  }, 10000)

  it('stays hidden after a prior choice', () => {
    setCookieConsent('declined')
    render(
      <MemoryRouter initialEntries={['/']}>
        <CookieConsentBanner />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
