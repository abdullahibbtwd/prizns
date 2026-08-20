import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { RequireAuth } from './RequireAuth'

const useAuth = vi.fn()

vi.mock('@/lib/auth', () => ({
  useAuth: () => useAuth(),
}))

function renderGate(initialPath = '/cms/todos') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/cms/login" element={<div>Login page</div>} />
        <Route path="/cms" element={<RequireAuth />}>
          <Route path="todos" element={<div>Protected todos</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireAuth', () => {
  it('shows a loading state while auth resolves', () => {
    useAuth.mockReturnValue({ user: null, loading: true })
    renderGate()
    expect(screen.getByText(/checking session/i)).toBeInTheDocument()
  })

  it('redirects anonymous users to login', () => {
    useAuth.mockReturnValue({ user: null, loading: false })
    renderGate()
    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('renders nested routes for authenticated users', () => {
    useAuth.mockReturnValue({
      user: { id: 'u1', email: 'editor@prizni.bg', role: 'EDITOR', emailVerified: true },
      loading: false,
    })
    renderGate()
    expect(screen.getByText('Protected todos')).toBeInTheDocument()
  })

  it('sends users away from pages their role cannot open', () => {
    useAuth.mockReturnValue({
      user: {
        id: 'u1',
        email: 'writer@prizni.bg',
        role: 'AUTHOR',
        emailVerified: true,
      },
      loading: false,
    })
    render(
      <MemoryRouter initialEntries={['/cms/users']}>
        <Routes>
          <Route path="/cms" element={<RequireAuth />}>
            <Route index element={<div>Dashboard</div>} />
            <Route path="users" element={<div>Users page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Users page')).not.toBeInTheDocument()
  })

  it('sends unverified users to the email confirmation page', () => {
    useAuth.mockReturnValue({
      user: { id: 'u1', email: 'new@prizni.bg', role: 'EDITOR', emailVerified: false },
      loading: false,
    })
    render(
      <MemoryRouter initialEntries={['/cms/todos']}>
        <Routes>
          <Route path="/cms/login" element={<div>Login page</div>} />
          <Route path="/cms/verify-email" element={<div>Verify page</div>} />
          <Route path="/cms" element={<RequireAuth />}>
            <Route path="todos" element={<div>Protected todos</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Verify page')).toBeInTheDocument()
  })
})
