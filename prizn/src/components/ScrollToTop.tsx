import { useEffect, useLayoutEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { smoothScrollToHash } from '@/lib/utils'

const positions = new Map<string, number>()

/**
 * Scrolls to top on forward navigations.
 * Restores the previous scroll position when the user goes back/forward (POP).
 */
export function ScrollToTop() {
  const { pathname, hash, key } = useLocation()
  const navigationType = useNavigationType()
  const locationKey = `${pathname}${hash}`

  // Keep the latest scroll for the current page so we can restore it later.
  useEffect(() => {
    const save = () => {
      positions.set(locationKey, window.scrollY)
    }

    save()
    window.addEventListener('scroll', save, { passive: true })
    return () => {
      save()
      window.removeEventListener('scroll', save)
    }
  }, [locationKey])

  useLayoutEffect(() => {
    if (hash) {
      const id = window.setTimeout(() => smoothScrollToHash(hash, 96), 80)
      return () => window.clearTimeout(id)
    }

    if (navigationType === 'POP') {
      const y = positions.get(pathname) ?? positions.get(locationKey) ?? 0
      const restore = () => window.scrollTo(0, y)
      restore()
      // Re-apply after layout/images settle so we don't bounce to the top.
      const frame = window.requestAnimationFrame(restore)
      const timer = window.setTimeout(restore, 120)
      return () => {
        window.cancelAnimationFrame(frame)
        window.clearTimeout(timer)
      }
    }

    window.scrollTo(0, 0)
  }, [pathname, hash, key, navigationType, locationKey])

  return null
}
