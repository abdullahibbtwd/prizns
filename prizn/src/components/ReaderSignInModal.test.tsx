import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

function renderModal() {
  return render(
    <MemoryRouter>
      <ReaderSignInModal />
    </MemoryRouter>,
  )
}

describe('ReaderSignInModal', () => {
  afterEach(() => {
    closeSignIn.mockClear()
    requestLink.mockClear()
  })

  it('sends a magic link and shows the sent state', async () => {
    const user = userEvent.setup()
    requestLink.mockResolvedValue({ authenticated: false })

    renderModal()

    await user.type(screen.getByRole('textbox'), 'reader@example.com')
    await user.click(screen.getByRole('button', { name: 'readerSignInSubmit' }))
    expect(requestLink).toHaveBeenCalledWith('reader@example.com', 'en')
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    renderModal()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(closeSignIn).toHaveBeenCalled()
  })

  it('keeps Continue disabled until the email looks valid', async () => {
    const user = userEvent.setup()
    renderModal()
    const submit = screen.getByRole('button', { name: 'readerSignInSubmit' })
    expect(submit).toBeDisabled()

    await user.type(screen.getByRole('textbox'), 'abc@')
    expect(submit).toBeDisabled()

    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'reader@example.com')
    expect(submit).toBeEnabled()
  })

  it('cycles Tab focus inside the dialog', async () => {
    const user = userEvent.setup()
    renderModal()
    const dialog = screen.getByRole('dialog')
    const email = screen.getByRole('textbox')
    const closeBtn = within(dialog).getByRole('button', { name: 'close' })
    const submit = screen.getByRole('button', { name: 'readerSignInSubmit' })

    await user.type(email, 'reader@example.com')
    expect(submit).toBeEnabled()
    email.focus()
    expect(email).toHaveFocus()

    await user.tab()
    expect(submit).toHaveFocus()

    await user.tab()
    expect(closeBtn).toHaveFocus()

    await user.tab()
    expect(email).toHaveFocus()
    expect(dialog.contains(document.activeElement)).toBe(true)

    await user.tab({ shift: true })
    expect(closeBtn).toHaveFocus()
  })
})
