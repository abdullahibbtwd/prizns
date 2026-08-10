import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import {
  sendAnalyticsBeacon,
  type BeaconPayload,
} from '@/lib/analytics-api'
import {
  ensureVisitorKey,
  getAnalyticsSessionId,
  getCookieConsent,
  setAnalyticsSessionId,
  type CookieConsent,
} from '@/lib/cookie-consent'

const HEARTBEAT_MS = 15000

type AnalyticsMeta = {
  articleId?: string | null
  title?: string | null
}

const AnalyticsMetaContext = createContext<{
  meta: AnalyticsMeta
  setMeta: (meta: AnalyticsMeta) => void
}>({
  meta: {},
  setMeta: () => undefined,
})

async function postBeacon(payload: BeaconPayload) {
  try {
    const result = await sendAnalyticsBeacon(payload)
    if (result.sessionId) setAnalyticsSessionId(result.sessionId)
    return result
  } catch {
    return null
  }
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<AnalyticsMeta>({})
  const value = useMemo(() => ({ meta, setMeta }), [meta])
  return (
    <AnalyticsMetaContext.Provider value={value}>
      {children}
    </AnalyticsMetaContext.Provider>
  )
}

/** Call from article pages to attach article id/title to the active pageview. */
export function useAnalyticsMeta(meta: AnalyticsMeta) {
  const { setMeta } = useContext(AnalyticsMetaContext)
  useEffect(() => {
    setMeta(meta)
    return () => setMeta({})
  }, [meta.articleId, meta.title, setMeta])
}

function useAnalyticsConsent() {
  const [consent, setConsent] = useState<CookieConsent>(() =>
    typeof window === 'undefined' ? null : getCookieConsent(),
  )

  useEffect(() => {
    setConsent(getCookieConsent())
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<CookieConsent>).detail
      setConsent(detail ?? getCookieConsent())
    }
    window.addEventListener('prizni-cookie-consent', onChange)
    return () => window.removeEventListener('prizni-cookie-consent', onChange)
  }, [])

  return consent
}

export function AnalyticsTracker() {
  const location = useLocation()
  const consent = useAnalyticsConsent()
  const { meta } = useContext(AnalyticsMetaContext)
  const pageViewIdRef = useRef<string | null>(null)
  const segmentStartedAtRef = useRef(Date.now())
  const accumulatedMsRef = useRef(0)
  const pathRef = useRef(location.pathname)
  const metaRef = useRef(meta)

  useEffect(() => {
    metaRef.current = meta
  }, [meta])

  useEffect(() => {
    if (consent !== 'accepted') return
    if (location.pathname.startsWith('/cms')) return

    const visitorKey = ensureVisitorKey()
    if (!visitorKey) return

    const path = location.pathname + location.search
    let decodedPath = path
    try {
      decodedPath = decodeURIComponent(path)
    } catch {
      // keep raw path
    }
    pathRef.current = decodedPath
    segmentStartedAtRef.current = Date.now()
    accumulatedMsRef.current = 0
    pageViewIdRef.current = null

    let cancelled = false

    const currentDwellMs = () => {
      const live =
        document.visibilityState === 'visible'
          ? Math.max(0, Date.now() - segmentStartedAtRef.current)
          : 0
      return accumulatedMsRef.current + live
    }

    ;(async () => {
      // Wait briefly so article pages can publish articleId/title
      for (let i = 0; i < 8 && !cancelled; i++) {
        await new Promise((r) => setTimeout(r, 50))
        if (metaRef.current.articleId) break
      }
      if (cancelled) return
      const params = new URLSearchParams(location.search)
      const result = await postBeacon({
        visitorKey,
        sessionId: getAnalyticsSessionId(),
        event: 'pageview',
        path: decodedPath,
        articleId: metaRef.current.articleId || undefined,
        title: metaRef.current.title || document.title || undefined,
        referrer: document.referrer || undefined,
        utmSource: params.get('utm_source') || undefined,
        utmMedium: params.get('utm_medium') || undefined,
        utmCampaign: params.get('utm_campaign') || undefined,
        dwellMs: 0,
      })
      if (!cancelled && result?.pageViewId) {
        pageViewIdRef.current = result.pageViewId
      }
    })()

    const flush = (event: 'heartbeat' | 'leave') => {
      const pageViewId = pageViewIdRef.current
      if (!pageViewId) return
      void postBeacon({
        visitorKey,
        sessionId: getAnalyticsSessionId(),
        pageViewId,
        event,
        path: pathRef.current,
        articleId: metaRef.current.articleId || undefined,
        title: metaRef.current.title || undefined,
        dwellMs: currentDwellMs(),
      })
    }

    const heartbeat = window.setInterval(() => {
      if (document.visibilityState === 'visible') flush('heartbeat')
    }, HEARTBEAT_MS)

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        accumulatedMsRef.current += Math.max(
          0,
          Date.now() - segmentStartedAtRef.current,
        )
        flush('leave')
      } else {
        segmentStartedAtRef.current = Date.now()
      }
    }

    const onPageHide = () => {
      if (document.visibilityState === 'visible') {
        accumulatedMsRef.current += Math.max(
          0,
          Date.now() - segmentStartedAtRef.current,
        )
        segmentStartedAtRef.current = Date.now()
      }
      flush('leave')
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)

    return () => {
      cancelled = true
      window.clearInterval(heartbeat)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
      if (document.visibilityState === 'visible') {
        accumulatedMsRef.current += Math.max(
          0,
          Date.now() - segmentStartedAtRef.current,
        )
      }
      flush('leave')
    }
  }, [consent, location.pathname, location.search])

  return null
}
