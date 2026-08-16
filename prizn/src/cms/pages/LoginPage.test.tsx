import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import CmsLoginPage from './LoginPage'

const login = vi.fn()
const setLang = vi.fn()

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    login,
    logout: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock('@/hooks/useJournalLang', () => ({
  useJournalLang: () => ({ lang: 'en', setLang }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/cms/login']}>
      <Routes>
        <Route path="/cms/login" element={<CmsLoginPage />} />
        <Route path="/cms" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CmsLoginPage', () => {
  it('submits credentials and navigates on success', async () => {
    const user = userEvent.setup()
    login.mockResolvedValue(undefined)
    renderLogin()

    await user.type(screen.getByLabelText('cms.login.email'), 'editor@prizni.bg')
    await user.type(screen.getByLabelText('cms.login.password'), 'password1')
    await user.click(screen.getByRole('button', { name: 'cms.login.submit' }))

    expect(login).toHaveBeenCalledWith('editor@prizni.bg', 'password1')
  })

  it('toggles password visibility', async () => {
    const user = userEvent.setup()
    renderLogin()

    const password = screen.getByLabelText('cms.login.password')
    expect(password).toHaveAttribute('type', 'password')

    await user.click(
      screen.getByRole('button', { name: 'cms.login.showPassword' }),
    )
    expect(password).toHaveAttribute('type', 'text')

    await user.click(
      screen.getByRole('button', { name: 'cms.login.hidePassword' }),
    )
    expect(password).toHaveAttribute('type', 'password')
  })

  it('toggles language', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.click(screen.getByRole('button', { name: 'EN' }))
    expect(setLang).toHaveBeenCalledWith('bg')
  })
})
