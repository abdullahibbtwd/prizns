import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, ApiError, type AuthUser } from '@/lib/api'

export type { AuthUser }

type AuthState = {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<boolean>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      await api.post<{ user: AuthUser }>('/auth/refresh')
      const me = await api.get<{ user: AuthUser }>('/auth/me')
      setUser(me.user)
      return true
    } catch {
      setUser(null)
      return false
    }
  }

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const me = await api.get<{ user: AuthUser }>('/auth/me')
        if (!cancelled) setUser(me.user)
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          const ok = await refresh()
          if (!cancelled && !ok) setUser(null)
        } else if (!cancelled) {
          setUser(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once
  }, [])

  const login = async (email: string, password: string) => {
    const result = await api.post<{ user: AuthUser }>('/auth/login', {
      email,
      password,
    })
    setUser(result.user)
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
