import {
  usePublicArticles,
  usePublicSeries,
} from '@/lib/public-content'

/**
 * Lightweight presence checks for nav/footer + homepage empty-section hiding.
 * Links stay visible while loading; they hide only after a confirmed empty result.
 */
export function useSectionPresence() {
  const stories = usePublicArticles('stories', { limit: 1 })
  const places = usePublicArticles('places', { limit: 1 })
  const events = usePublicArticles('events', { limit: 1 })
  const traditions = usePublicArticles('traditions', { limit: 1 })
  const sports = usePublicArticles('sports', { limit: 1 })
  const discover = usePublicArticles('discover', { limit: 1 })
  const news = usePublicArticles('news', { limit: 1 })
  const video = usePublicArticles('video', { limit: 1 })
  const series = usePublicSeries()
  const voices = usePublicArticles(undefined, { hasAudio: true, limit: 1 })

  const ready = (query: { isLoading: boolean }) => !query.isLoading

  const has = (query: {
    isLoading: boolean
    data?: unknown[] | null
  }) => {
    if (!ready(query)) return true
    return (query.data?.length ?? 0) > 0
  }

  const hasDiscover =
    !ready(series) || !ready(discover)
      ? true
      : (series.data?.length ?? 0) > 0 || (discover.data?.length ?? 0) > 0

  const hasVoices = (() => {
    if (!ready(voices)) return true
    return (voices.data ?? []).some((article) => Boolean(article.audioUrl))
  })()

  return {
    hasStories: has(stories),
    hasPlaces: has(places),
    hasEvents: has(events),
    hasTraditions: has(traditions),
    hasSports: has(sports),
    hasDiscover,
    hasNews: has(news),
    hasVideo: has(video),
    hasVoices,
    /** Path → whether the matching nav destination should stay visible. */
    isPathVisible(path: string): boolean {
      switch (path) {
        case '/stories':
          return has(stories)
        case '/places':
          return has(places)
        case '/events':
          return has(events)
        case '/traditions':
          return has(traditions)
        case '/sports':
          return has(sports)
        case '/discover':
          return hasDiscover
        case '/news':
          return has(news)
        case '/video':
          return has(video)
        case '/voices':
          return hasVoices
        default:
          return true
      }
    },
  }
}
