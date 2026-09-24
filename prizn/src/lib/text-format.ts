/** Join date/location-style meta bits with ` · `, skipping empties. */
export function joinMetaParts(
  ...parts: Array<string | null | undefined>
): string {
  return parts
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' · ')
}

/** Truncate at the last full word before `max`, then append an ellipsis. */
export function truncateAtWord(text: string, max = 140): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  const slice = trimmed.slice(0, max)
  const lastSpace = slice.lastIndexOf(' ')
  const cut =
    lastSpace > Math.floor(max * 0.5) ? slice.slice(0, lastSpace) : slice
  return `${cut.trimEnd()}…`
}
