import { randomId } from '@/lib/utils'

const CONSENT_KEY = 'prizni-cookie-consent'
export const VISITOR_KEY = 'prizni-visitor-key'
export const SESSION_KEY = 'prizni-analytics-session'

export type CookieConsent = 'accepted' | 'declined' | null

function uuid() {
  return randomId()
}

export function getCookieConsent(): CookieConsent {
  try {
    const value = localStorage.getItem(CONSENT_KEY)
    if (value === 'accepted' || value === 'declined') return value
    return null
  } catch {
    return null
  }
}

export function setCookieConsent(value: 'accepted' | 'declined') {
  try {
    localStorage.setItem(CONSENT_KEY, value)
  } catch {
    // ignore
  }

  if (value === 'accepted') {
    ensureVisitorKey()
  } else {
    clearVisitorIdentity()
  }

  window.dispatchEvent(
    new CustomEvent('prizni-cookie-consent', { detail: value }),
  )
}

/** Stable visitor id — only created after cookie consent is accepted. */
export function ensureVisitorKey(): string | null {
  if (getCookieConsent() !== 'accepted') return null
  try {
    const existing = localStorage.getItem(VISITOR_KEY)
    if (existing) return existing
    const next = uuid()
    localStorage.setItem(VISITOR_KEY, next)
    return next
  } catch {
    return null
  }
}

export function getVisitorKey(): string | null {
  if (getCookieConsent() !== 'accepted') return null
  try {
    return localStorage.getItem(VISITOR_KEY)
  } catch {
    return null
  }
}

export function clearVisitorIdentity() {
  try {
    localStorage.removeItem(VISITOR_KEY)
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}

export function getAnalyticsSessionId(): string | undefined {
  try {
    return sessionStorage.getItem(SESSION_KEY) || undefined
  } catch {
    return undefined
  }
}

export function setAnalyticsSessionId(id: string) {
  try {
    sessionStorage.setItem(SESSION_KEY, id)
  } catch {
    // ignore
  }
}

const REACTION_SESSION_KEY = 'prizni-reaction-key'

/**
 * Soft id for “I Relate” — prefers consented visitor key;
 * falls back to a session-only key when cookies were declined / pending.
 */
export function ensureReactionVisitorKey(): string {
  const consented = ensureVisitorKey()
  if (consented) return consented
  try {
    const existing = sessionStorage.getItem(REACTION_SESSION_KEY)
    if (existing) return existing
    const next = uuid()
    sessionStorage.setItem(REACTION_SESSION_KEY, next)
    return next
  } catch {
    return uuid()
  }
}
