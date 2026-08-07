/** Human-readable duration: 65s → 1m 5s, 3600s → 1h, 3900s → 1h 5m */
export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000))
  const hours = Math.floor(totalSec / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
  }
  return `${seconds}s`
}

export function formatTrendPct(pct: number): string {
  if (pct === 0) return '0%'
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct}%`
}

/** Turn `/stories/%D0%B8...` into readable Cyrillic paths. */
export function formatPath(path: string): string {
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}
