import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { api, ApiError, type AuthUser } from '@/lib/api'
import {
  bindCmsSessionListener,
  refreshCmsSession,
} from '@/lib/cms-session'

export type { AuthUser }

type AuthState = {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  refresh: () => Promise<boolean>
  reload: () => Promise<void>
  verifyEmail: (code: string) => Promise<void>
  resendVerification: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    bindCmsSessionListener(setUser)
    return () => bindCmsSessionListener(null)
  }, [])

  // refreshCmsSession already updates user via bindCmsSessionListener.
  // Avoid a second setUser(null) from a superseded StrictMode mount racing
  // a successful sibling refresh.
  const refresh = useCallback(async () => {
    const ok = await refreshCmsSession()
    return ok
  }, [])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const me = await api.get<{ user: AuthUser }>('/auth/me', {
          skipAuthRefresh: true,
        })
        if (!cancelled) setUser(me.user)
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          const ok = await refresh()
          // refreshCmsSession already updated user via the listener when ok;
          // only clear when this mount is still active and refresh failed.
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
  }, [refresh])

  const login = async (email: string, password: string) => {
    const result = await api.post<{ user: AuthUser }>(
      '/auth/login',
      { email, password },
      { skipAuthRefresh: true },
    )
    setUser(result.user)
    return result.user
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout', undefined, { skipAuthRefresh: true })
    } finally {
      setUser(null)
    }
  }

  const reload = async () => {
    const me = await api.get<{ user: AuthUser }>('/auth/me', {
      skipAuthRefresh: true,
    })
    setUser(me.user)
  }

  const verifyEmail = async (code: string) => {
    const result = await api.post<{ user: AuthUser }>(
      '/auth/verify-email',
      { code },
      { skipAuthRefresh: true },
    )
    setUser(result.user)
  }

  const resendVerification = async () => {
    await api.post('/auth/resend-verification', undefined, {
      skipAuthRefresh: true,
    })
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refresh,
        reload,
        verifyEmail,
        resendVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
