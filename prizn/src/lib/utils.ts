import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { MouseEvent } from "react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
