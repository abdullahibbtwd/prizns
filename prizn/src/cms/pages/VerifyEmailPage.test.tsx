import { render, screen } from '@testing-library/react'
import { ApiError } from '@/lib/api'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CmsVerifyEmailPage from './VerifyEmailPage'

const verifyEmail = vi.fn()
const resendVerification = vi.fn()
const verificationResendIn = vi.fn()
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
    verificationResendIn,
    logout,
  }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { email?: string; time?: string }) =>
      opts?.email
        ? `${key} ${opts.email}`
        : opts?.time
          ? `${key} ${opts.time}`
          : key,
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
  beforeEach(() => {
    resendVerification.mockReset()
    verificationResendIn.mockReset()
    verificationResendIn.mockResolvedValue(0)
  })

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
    resendVerification.mockResolvedValue(120)
    renderVerify()
    await user.click(await screen.findByRole('button', { name: 'cms.verify.resend' }))
    expect(resendVerification).toHaveBeenCalled()
    expect(
      await screen.findByRole('button', { name: 'cms.verify.resendIn 2:00' }),
    ).toBeDisabled()
  })

  it('waits out the cooldown left from sign-in before allowing a new code', async () => {
    verificationResendIn.mockResolvedValue(95)
    renderVerify()
    expect(
      await screen.findByRole('button', { name: 'cms.verify.resendIn 1:35' }),
    ).toBeDisabled()
    expect(resendVerification).not.toHaveBeenCalled()
    expect(screen.getByRole('timer')).toHaveTextContent(
      'cms.verify.waitToResend 1:35',
    )
  })

  it('shows the remaining wait when the server refuses a new code', async () => {
    const user = userEvent.setup()
    resendVerification.mockRejectedValue(
      new ApiError(429, 'Wait 40 seconds before requesting another code.', 40),
    )
    renderVerify()
    await user.click(await screen.findByRole('button', { name: 'cms.verify.resend' }))
    expect(
      await screen.findByRole('button', { name: 'cms.verify.resendIn 0:40' }),
    ).toBeDisabled()
  })
})
