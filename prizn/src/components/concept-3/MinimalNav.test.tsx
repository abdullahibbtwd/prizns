import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { MinimalNav } from './MinimalNav'

vi.mock('@/lib/reader-auth', () => ({
  useReaderAuth: () => ({
    reader: null,
    enabled: false,
    openSignIn: vi.fn(),
  }),
}))

vi.mock('@/hooks/useSectionPresence', () => ({
  useSectionPresence: () => ({ isPathVisible: () => true }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/components/LocaleLink', () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string
    children: React.ReactNode
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/concept-3/MobileNavMenu', () => ({
  MobileNavMenu: () => null,
}))

vi.mock('@/components/concept-3/JournalSearchOverlay', () => ({
  JournalSearchOverlay: () => null,
}))

describe('MinimalNav contribute dropdown', () => {
  it('closes on Escape and restores focus to the trigger', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <MinimalNav lang="bg" setLang={vi.fn()} variant="solid" />
      </MemoryRouter>,
    )

    const trigger = screen.getByRole('button', { name: /Присъединете се/i })
    await user.click(trigger)
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('closes on outside click', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <div>
          <button type="button">Outside</button>
          <MinimalNav lang="en" setLang={vi.fn()} variant="solid" />
        </div>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /Contribute/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Outside' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes when the language changes', async () => {
    const user = userEvent.setup()
    const setLang = vi.fn()
    const { rerender } = render(
      <MemoryRouter>
        <MinimalNav lang="bg" setLang={setLang} variant="solid" />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /Присъединете се/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    rerender(
      <MemoryRouter>
        <MinimalNav lang="en" setLang={setLang} variant="solid" />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
