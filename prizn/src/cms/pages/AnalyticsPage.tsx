import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ChartColumn, Clock3, Eye, FileText } from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
  StatCard,
} from '@/cms/components/CmsUI'
import {
  getAnalyticsSummary,
  type AnalyticsRange,
} from '@/lib/analytics-api'
import { formatTrendPct, formatPath } from '@/lib/format'
import { cn } from '@/lib/utils'

const RANGES: AnalyticsRange[] = ['today', 'week', 'month']

const RANGE_KEYS: Record<AnalyticsRange, string> = {
  today: 'cms.analytics.rangeToday',
  week: 'cms.analytics.rangeWeek',
  month: 'cms.analytics.rangeMonth',
}

export default function CmsAnalyticsPage() {
  const { t } = useTranslation()
  const [range, setRange] = useState<AnalyticsRange>('today')

  const summaryQuery = useQuery({
    queryKey: ['cms-analytics-summary', range],
    queryFn: () => getAnalyticsSummary(range),
  })

  const data = summaryQuery.data
  const sparkline = data?.daily?.map((d) => d.views) ?? [0, 0, 0, 0]
  const signedInSessions = data?.loggedInSessions ?? 0
  const anonymousSessions = data?.anonymousSessions ?? 0
  const cohortTotal = signedInSessions + anonymousSessions
  const signedInShare =
    cohortTotal > 0 ? Math.round((signedInSessions / cohortTotal) * 100) : 0
  const anonymousShare =
    cohortTotal > 0 ? Math.round((anonymousSessions / cohortTotal) * 100) : 0

  return (
    <div>
      <CmsPageHeader
        title={t('cms.analytics.title')}
        description={t('cms.analytics.description')}
        badge={t('cms.analytics.badge')}
        actions={
          <div className="flex items-center rounded-xl border border-[#E8E4DC] bg-white p-1 shadow-2xs">
            {RANGES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRange(item)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all',
                  range === item
                    ? 'bg-[#0C2686] text-white shadow-xs'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
                )}
              >
                {t(RANGE_KEYS[item])}
              </button>
            ))}
          </div>
        }
      />

      {summaryQuery.isError && (
        <CmsCard className="mb-6 p-6 text-sm text-rose-700">
          {t('cms.analytics.loadFailed')} {(summaryQuery.error as Error).message}
        </CmsCard>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t('cms.analytics.visitors')}
          value={(data?.visitors ?? 0).toLocaleString()}
          trend={formatTrendPct(data?.visitorsTrendPct ?? 0)}
          trendType={
            (data?.visitorsTrendPct ?? 0) > 0
              ? 'up'
              : (data?.visitorsTrendPct ?? 0) < 0
                ? 'down'
                : 'neutral'
          }
          hint={t('cms.analytics.visitorsHint')}
          icon={Eye}
          sparklineData={sparkline}
        />
        <StatCard
          title={t('cms.analytics.pageviews')}
          value={(data?.pageviews ?? 0).toLocaleString()}
          trend={formatTrendPct(data?.pageviewsTrendPct ?? 0)}
          trendType={
            (data?.pageviewsTrendPct ?? 0) > 0
              ? 'up'
              : (data?.pageviewsTrendPct ?? 0) < 0
                ? 'down'
                : 'neutral'
          }
          hint={t('cms.analytics.pageviewsHint')}
          icon={FileText}
          sparklineData={sparkline}
        />
        <StatCard
          title={t('cms.analytics.avgTime')}
          value={data?.avgDwellLabel ?? '0s'}
          trend={t('cms.analytics.avgTimePrev', {
            value: data?.previous.avgDwellLabel ?? '0s',
          })}
          trendType="neutral"
          hint={t('cms.analytics.avgTimeHint')}
          icon={Clock3}
          sparklineData={sparkline}
        />
        <StatCard
          title={t('cms.analytics.totalReading')}
          value={data?.totalDwellLabel ?? '0s'}
          trend={t('cms.analytics.totalReadingTrend', {
            count: data?.topStories.length ?? 0,
          })}
          trendType="neutral"
          hint={t('cms.analytics.totalReadingHint')}
          icon={ChartColumn}
          sparklineData={sparkline}
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          title={t('cms.analytics.signedIn')}
          value={signedInSessions.toLocaleString()}
          trend={
            cohortTotal > 0
              ? t('cms.analytics.signedInTrend', {
                  pct: signedInShare,
                  total: cohortTotal,
                })
              : t('cms.analytics.noSessions')
          }
          trendType="neutral"
          hint={t('cms.analytics.signedInHint')}
          icon={Eye}
        />
        <StatCard
          title={t('cms.analytics.anonymous')}
          value={anonymousSessions.toLocaleString()}
          trend={
            cohortTotal > 0
              ? t('cms.analytics.signedInTrend', {
                  pct: anonymousShare,
                  total: cohortTotal,
                })
              : t('cms.analytics.noSessions')
          }
          trendType="neutral"
          hint={t('cms.analytics.anonymousHint')}
          icon={FileText}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CmsCard hover={false} className="overflow-hidden p-0">
          <div className="border-b border-[#E8E4DC] bg-[#FAF8F3] px-5 py-3.5">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-stone-700">
              {t('cms.analytics.topPages')}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="border-b border-[#E8E4DC] bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">{t('cms.analytics.colPath')}</th>
                  <th className="px-4 py-3">{t('cms.analytics.colViews')}</th>
                  <th className="px-4 py-3">{t('cms.analytics.colAvgTime')}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.topPages ?? []).length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-stone-500">
                      {t('cms.analytics.emptyPages')}
                    </td>
                  </tr>
                )}
                {(data?.topPages ?? []).map((row) => (
                  <tr key={row.path} className="border-b border-[#E8E4DC]/70">
                    <td className="px-4 py-3 font-medium text-stone-900">
                      {formatPath(row.path)}
                    </td>
                    <td className="px-4 py-3 text-stone-700">{row.views}</td>
                    <td className="px-4 py-3 text-stone-600">{row.avgDwellLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CmsCard>

        <CmsCard hover={false} className="overflow-hidden p-0">
          <div className="border-b border-[#E8E4DC] bg-[#FAF8F3] px-5 py-3.5">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-stone-700">
              {t('cms.analytics.topStories')}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="border-b border-[#E8E4DC] bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">{t('cms.analytics.colStory')}</th>
                  <th className="px-4 py-3">{t('cms.analytics.colViews')}</th>
                  <th className="px-4 py-3">{t('cms.analytics.colAvgTime')}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.topStories ?? []).length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-stone-500">
                      {t('cms.analytics.emptyStories')}
                    </td>
                  </tr>
                )}
                {(data?.topStories ?? []).map((row) => (
                  <tr
                    key={row.articleId || row.title}
                    className="border-b border-[#E8E4DC]/70"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-900">{row.title}</p>
                      {row.path && (
                        <p className="text-xs text-stone-500">
                          {formatPath(row.path)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-700">{row.views}</td>
                    <td className="px-4 py-3 text-stone-600">{row.avgDwellLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CmsCard>
      </div>

      {data?.trafficSources && data.trafficSources.length > 0 ? (
        <CmsCard hover={false} className="mt-6 overflow-hidden p-0">
          <div className="border-b border-[#E8E4DC] bg-[#FAF8F3] px-5 py-3.5">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-stone-700">
              {t('cms.analytics.trafficSources')}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead className="border-b border-[#E8E4DC] bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">{t('cms.analytics.colSource')}</th>
                  <th className="px-4 py-3">{t('cms.analytics.colViews')}</th>
                </tr>
              </thead>
              <tbody>
                {data.trafficSources.map((row) => (
                  <tr
                    key={row.source}
                    className="border-b border-[#E8E4DC]/70"
                  >
                    <td className="px-4 py-3 font-medium text-stone-900">
                      {row.source}
                    </td>
                    <td className="px-4 py-3 text-stone-700">{row.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CmsCard>
      ) : null}

      <CmsCard hover={false} className="mt-6 overflow-hidden p-0">
        <div className="border-b border-[#E8E4DC] bg-[#FAF8F3] px-5 py-3.5">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-stone-700">
            {t('cms.analytics.topClicks')}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="border-b border-[#E8E4DC] bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-4 py-3">{t('cms.analytics.colLabel')}</th>
                <th className="px-4 py-3">{t('cms.analytics.colHref')}</th>
                <th className="px-4 py-3">{t('cms.analytics.colClicks')}</th>
              </tr>
            </thead>
            <tbody>
              {(data?.topClicks ?? []).length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-stone-500">
                    {t('cms.analytics.emptyClicks')}
                  </td>
                </tr>
              )}
              {(data?.topClicks ?? []).map((row) => (
                <tr key={row.href} className="border-b border-[#E8E4DC]/70">
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-900">{row.label}</p>
                    <p className="text-[11px] uppercase tracking-wider text-stone-500">
                      {row.kind}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-stone-600">
                    {row.href}
                  </td>
                  <td className="px-4 py-3 text-stone-700">{row.clicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CmsCard>
    </div>
  )
}
