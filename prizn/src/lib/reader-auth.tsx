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

function isReaderAuthVerifyPath(pathname: string) {
  return pathname === '/auth/verify' || pathname.endsWith('/auth/verify')
}

export function ReaderAuthProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const isCms = location.pathname.startsWith('/cms')
  const isVerify = isReaderAuthVerifyPath(location.pathname)
  const [reader, setReader] = useState<Reader | null>(null)
  const [loading, setLoading] = useState(FEATURE_ENABLED)
  const [modalOpen, setModalOpen] = useState(false)
  const [pending, setPending] = useState<PendingIntent>(null)

  const refresh = useCallback(async () => {
    if (!FEATURE_ENABLED) return false
    if (isCms) return false
    try {
      await refreshReaderSession()
      const me = await getReaderMe()
      setReader(me.reader)
      return true
    } catch {
      setReader(null)
      return false
    }
  }, [isCms])

  useEffect(() => {
    if (!FEATURE_ENABLED) {
      setLoading(false)
      return
    }
    // CMS staff desk does not use reader sessions — skip probes (no 401 noise).
    if (isCms) {
      setReader(null)
      setLoading(false)
      return
    }
    // Verify owns session creation; a parallel /me 401 must not race-clear
    // the reader right after the magic-link POST sets cookies + setReader.
    if (isVerify) {
      setLoading(false)
      return
    }
    // Reader cookies are httpOnly (and may live on the API host), so they are
    // invisible to document.cookie. Always probe /me; credentials:include
    // still sends the session. Skipping based on document.cookie caused
    // setReader(null) after every magic-link verify + navigate.
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
  }, [isCms, isVerify, refresh])

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
