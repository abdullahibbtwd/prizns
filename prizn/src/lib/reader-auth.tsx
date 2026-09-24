import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import { ApiError } from '@/lib/api'
import {
  getReaderMe,
  logoutReader,
  refreshReaderSession,
  requestMagicLink,
  saveArticle,
  type MagicLinkIntent,
  type Reader,
} from '@/lib/reader-api'

type PendingIntent = {
  intent?: MagicLinkIntent
  returnUrl?: string
} | null

type ReaderAuthState = {
  reader: Reader | null
  loading: boolean
  enabled: boolean
  modalOpen: boolean
  pending: PendingIntent
  openSignIn: (opts?: {
    intent?: MagicLinkIntent
    returnUrl?: string
  }) => void
  closeSignIn: () => void
  requestLink: (
    email: string,
    locale?: string,
  ) => Promise<{ authenticated: boolean; returnUrl?: string | null }>
  logout: () => Promise<void>
  refresh: () => Promise<boolean>
  setReader: (reader: Reader | null) => void
}

const ReaderAuthContext = createContext<ReaderAuthState | null>(null)

const FEATURE_ENABLED =
  String(import.meta.env.VITE_FEATURE_READER_AUTH ?? 'true').toLowerCase() !==
  'false'

/** Match api/src/reader-auth/reader-auth.types.ts cookie names. */
const READER_ACCESS_COOKIE = 'prizn_reader_access'
const READER_REFRESH_COOKIE = 'prizn_reader_refresh'

function hasReaderSessionCookie(): boolean {
  if (typeof document === 'undefined') return false
  const raw = document.cookie || ''
  return (
    raw.includes(`${READER_ACCESS_COOKIE}=`) ||
    raw.includes(`${READER_REFRESH_COOKIE}=`)
  )
}

export function ReaderAuthProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [reader, setReader] = useState<Reader | null>(null)
  const [loading, setLoading] = useState(FEATURE_ENABLED)
  const [modalOpen, setModalOpen] = useState(false)
  const [pending, setPending] = useState<PendingIntent>(null)

  const refresh = useCallback(async () => {
    if (!FEATURE_ENABLED) return false
    if (location.pathname.startsWith('/cms')) return false
    try {
      await refreshReaderSession()
      const me = await getReaderMe()
      setReader(me.reader)
      return true
    } catch {
      setReader(null)
      return false
    }
  }, [location.pathname])

  useEffect(() => {
    if (!FEATURE_ENABLED) {
      setLoading(false)
      return
    }
    // CMS staff desk does not use reader sessions — skip probes (no 401 noise).
    if (location.pathname.startsWith('/cms')) {
      setReader(null)
      setLoading(false)
      return
    }
    // Anonymous visitors have no session cookies — skip /me + /refresh.
    if (!hasReaderSessionCookie()) {
      setReader(null)
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const me = await getReaderMe()
        if (!cancelled) setReader(me.reader)
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          const ok = await refresh()
          if (!cancelled && !ok) setReader(null)
        } else if (!cancelled) {
          setReader(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [location.pathname, refresh])

  const openSignIn = useCallback(
    (opts?: { intent?: MagicLinkIntent; returnUrl?: string }) => {
      if (!FEATURE_ENABLED) return
      setPending(opts ?? null)
      setModalOpen(true)
    },
    [],
  )

  const closeSignIn = useCallback(() => {
    setModalOpen(false)
  }, [])

  const requestLink = useCallback(
    async (email: string, locale?: string) => {
      const result = await requestMagicLink({
        email,
        locale,
        returnUrl: pending?.returnUrl,
        intent: pending?.intent,
      })

      if (result.authenticated) {
        setReader(result.reader)
        if (result.intent?.type === 'save' && result.intent.articleId) {
          try {
            await saveArticle(result.intent.articleId)
          } catch {
            // Session is valid even if save fails; user can retry on article.
          }
        }
        const returnUrl = result.returnUrl
        setPending(null)
        return { authenticated: true, returnUrl }
      }

      return { authenticated: false }
    },
    [pending],
  )

  const logout = useCallback(async () => {
    try {
      await logoutReader()
    } finally {
      setReader(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      reader,
      loading,
      enabled: FEATURE_ENABLED,
      modalOpen,
      pending,
      openSignIn,
      closeSignIn,
      requestLink,
      logout,
      refresh,
      setReader,
    }),
    [
      reader,
      loading,
      modalOpen,
      pending,
      openSignIn,
      closeSignIn,
      requestLink,
      logout,
      refresh,
    ],
  )

  return (
    <ReaderAuthContext.Provider value={value}>
      {children}
    </ReaderAuthContext.Provider>
  )
}

export function useReaderAuth() {
  const ctx = useContext(ReaderAuthContext)
  if (!ctx) throw new Error('useReaderAuth must be used within ReaderAuthProvider')
  return ctx
}
