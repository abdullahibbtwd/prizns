import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { MouseEvent } from "react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * UUID-ish id that works outside secure contexts.
 * `crypto.randomUUID` is missing on plain HTTP (common on Coolify IPs).
 */
export function randomId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID()
  }
  if (c && typeof c.getRandomValues === "function") {
    const bytes = new Uint8Array(16)
    c.getRandomValues(bytes)
    bytes[6] = (bytes[6]! & 0x0f) | 0x40
    bytes[8] = (bytes[8]! & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

/** Smooth-scroll to a hash target, accounting for sticky/fixed headers. */
export function smoothScrollToHash(hash: string, offset = 88) {
  const id = hash.replace(/^#/, "")
  if (!id) return

  const el = document.getElementById(id)
  if (!el) return

  const top = el.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top, behavior: "smooth" })
  window.history.pushState(null, "", `#${id}`)
}

/** Click handler for in-page nav hash links. */
export function handleSmoothNavClick(
  event: MouseEvent<HTMLAnchorElement>,
  href: string,
  offset = 88,
) {
  if (!href.startsWith("#")) return
  event.preventDefault()
  smoothScrollToHash(href, offset)
}
