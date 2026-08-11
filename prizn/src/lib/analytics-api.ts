import { api } from '@/lib/api'

export type AnalyticsRange = 'today' | 'week' | 'month'

export type AnalyticsSummary = {
  range: AnalyticsRange
  visitors: number
  pageviews: number
  avgDwellMs: number
  avgDwellLabel: string
  totalDwellMs: number
  totalDwellLabel: string
  loggedInSessions?: number
  anonymousSessions?: number
  visitorsTrendPct: number
  pageviewsTrendPct: number
  previous: {
    visitors: number
    pageviews: number
    avgDwellMs: number
    avgDwellLabel: string
  }
  topPages: Array<{
    path: string
    views: number
    avgDwellMs: number
    avgDwellLabel: string
  }>
  topStories: Array<{
    articleId: string | null
    title: string
    path: string | null
    views: number
    avgDwellMs: number
    avgDwellLabel: string
  }>
  daily: Array<{ day: string; views: number }>
  trafficSources?: Array<{ source: string; views: number }>
}

export type BeaconPayload = {
  visitorKey: string
  sessionId?: string
  pageViewId?: string
  event: 'pageview' | 'heartbeat' | 'leave'
  path: string
  articleId?: string
  title?: string
  referrer?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  readerId?: string
  dwellMs?: number
}

export type BeaconResponse = {
  ignored?: boolean
  sessionId?: string
  pageViewId?: string
}

export function getAnalyticsSummary(range: AnalyticsRange = 'today') {
  return api.get<AnalyticsSummary>(`/cms/analytics/summary?range=${range}`)
}

export function sendAnalyticsBeacon(body: BeaconPayload) {
  return api.post<BeaconResponse>('/analytics/beacon', body)
}
