import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import CmsVerifyEmailPage from './VerifyEmailPage'

const verifyEmail = vi.fn()
const resendVerification = vi.fn()
const logout = vi.fn()

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: {
      id: 'u1',
      email: 'new@prizni.bg',
      role: 'EDITOR',
      emailVerified: false,
    },
    loading: false,
    verifyEmail,
    resendVerification,
    logout,
  }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { email?: string }) =>
      opts?.email ? `${key} ${opts.email}` : key,
  }),
}))

function renderVerify() {
  return render(
    <MemoryRouter initialEntries={['/cms/verify-email']}>
      <Routes>
        <Route path="/cms/verify-email" element={<CmsVerifyEmailPage />} />
        <Route path="/cms" element={<div>Dashboard</div>} />
        <Route path="/cms/login" element={<div>Login</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CmsVerifyEmailPage', () => {
  it('submits a 6-digit code', async () => {
    const user = userEvent.setup()
    verifyEmail.mockResolvedValue(undefined)
    renderVerify()

    expect(screen.getByText(/cms.verify.subtitle new@prizni.bg/)).toBeInTheDocument()
    await user.type(screen.getByLabelText('cms.verify.code'), '123456')
    await user.click(screen.getByRole('button', { name: 'cms.verify.submit' }))
    expect(verifyEmail).toHaveBeenCalledWith('123456')
  })

  it('requests a new code', async () => {
    const user = userEvent.setup()
    resendVerification.mockResolvedValue(undefined)
    renderVerify()
    await user.click(screen.getByRole('button', { name: 'cms.verify.resend' }))
    expect(resendVerification).toHaveBeenCalled()
  })
})
