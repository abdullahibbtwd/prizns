import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HelmetProvider } from 'react-helmet-async'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './auth'
import { api, ApiError } from '@/lib/api'

vi.mock('@/lib/api', () => {
  class MockApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  }
  return {
    ApiError: MockApiError,
    api: {
      get: vi.fn(),
      post: vi.fn(),
    },
  }
})

function Probe() {
  const { user, loading, login, logout } = useAuth()
  if (loading) return <div>loading</div>
  return (
    <div>
      <span>{user ? user.email : 'guest'}</span>
      <button type="button" onClick={() => void login('a@b.c', 'secret12')}>
        login
      </button>
      <button type="button" onClick={() => void logout()}>
        logout
      </button>
    </div>
  )
}

describe('AuthProvider', () => {
  it('loads the current session', async () => {
    vi.mocked(api.get).mockResolvedValue({
      user: { id: 'u1', email: 'editor@prizni.bg', name: 'Ed', role: 'EDITOR' },
    })

    render(
      <HelmetProvider>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </HelmetProvider>,
    )

    expect(screen.getByText('loading')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('editor@prizni.bg')).toBeInTheDocument()
    })
  })

  it('logs in and out', async () => {
    vi.mocked(api.get).mockRejectedValue(new ApiError(401, 'nope'))
    vi.mocked(api.post).mockImplementation(async (path: string) => {
      if (path === '/auth/refresh') throw new ApiError(401, 'expired')
      if (path === '/auth/login') {
        return {
          user: {
            id: 'u1',
            email: 'a@b.c',
            name: null,
            role: 'EDITOR' as const,
          },
        }
      }
      return { ok: true }
    })

    const user = userEvent.setup()
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('guest')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'login' }))
    await waitFor(() => {
      expect(screen.getByText('a@b.c')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'logout' }))
    await waitFor(() => {
      expect(screen.getByText('guest')).toBeInTheDocument()
    })
  })

  it('throws outside the provider', () => {
    expect(() => render(<Probe />)).toThrow(/must be used within AuthProvider/)
  })
})
