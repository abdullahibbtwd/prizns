import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ReaderSignInModal } from './ReaderSignInModal'

const requestLink = vi.fn()
const closeSignIn = vi.fn()

vi.mock('@/lib/reader-auth', () => ({
  useReaderAuth: () => ({
    enabled: true,
    modalOpen: true,
    closeSignIn,
    requestLink,
  }),
}))

vi.mock('@/hooks/useJournalLang', () => ({
  useJournalLang: () => ({ lang: 'en', setLang: vi.fn() }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('ReaderSignInModal', () => {
  it('sends a magic link and shows the sent state', async () => {
    const user = userEvent.setup()
    requestLink.mockResolvedValue({ authenticated: false })

    render(
      <MemoryRouter>
        <ReaderSignInModal />
      </MemoryRouter>,
    )

    await user.type(screen.getByRole('textbox'), 'reader@example.com')
    await user.click(screen.getByRole('button', { name: 'readerSignInSubmit' }))
    expect(requestLink).toHaveBeenCalledWith('reader@example.com', 'en')
  })
})
