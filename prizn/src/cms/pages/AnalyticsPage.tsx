import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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

export default function CmsAnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>('today')

  const summaryQuery = useQuery({
    queryKey: ['cms-analytics-summary', range],
    queryFn: () => getAnalyticsSummary(range),
  })

  const data = summaryQuery.data
  const sparkline = data?.daily?.map((d) => d.views) ?? [0, 0, 0, 0]

  return (
    <div>
      <CmsPageHeader
        title="Editorial Analytics"
        description="Visitors, page views, dwell time, and top stories from the public site."
        badge="Live Metrics"
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
                {item}
              </button>
            ))}
          </div>
        }
      />

      {summaryQuery.isError && (
        <CmsCard className="mb-6 p-6 text-sm text-rose-700">
          Failed to load analytics. {(summaryQuery.error as Error).message}
        </CmsCard>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Unique Visitors"
          value={(data?.visitors ?? 0).toLocaleString()}
          trend={formatTrendPct(data?.visitorsTrendPct ?? 0)}
          trendType={
            (data?.visitorsTrendPct ?? 0) > 0
              ? 'up'
              : (data?.visitorsTrendPct ?? 0) < 0
                ? 'down'
                : 'neutral'
          }
          hint="Distinct readers"
          icon={Eye}
          sparklineData={sparkline}
        />
        <StatCard
          title="Page Views"
          value={(data?.pageviews ?? 0).toLocaleString()}
          trend={formatTrendPct(data?.pageviewsTrendPct ?? 0)}
          trendType={
            (data?.pageviewsTrendPct ?? 0) > 0
              ? 'up'
              : (data?.pageviewsTrendPct ?? 0) < 0
                ? 'down'
                : 'neutral'
          }
          hint="All public pages"
          icon={FileText}
          sparklineData={sparkline}
        />
        <StatCard
          title="Avg Time on Site"
          value={data?.avgDwellLabel ?? '0s'}
          trend={`Prev ${data?.previous.avgDwellLabel ?? '0s'}`}
          trendType="neutral"
          hint="Average dwell per page"
          icon={Clock3}
          sparklineData={sparkline}
        />
        <StatCard
          title="Total Reading Time"
          value={data?.totalDwellLabel ?? '0s'}
          trend={`${data?.topStories.length ?? 0} stories tracked`}
          trendType="neutral"
          hint="Sum of all page dwell"
          icon={ChartColumn}
          sparklineData={sparkline}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CmsCard hover={false} className="overflow-hidden p-0">
          <div className="border-b border-[#E8E4DC] bg-[#FAF8F3] px-5 py-3.5">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-stone-700">
              Top Pages
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="border-b border-[#E8E4DC] bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">Path</th>
                  <th className="px-4 py-3">Views</th>
                  <th className="px-4 py-3">Avg time</th>
                </tr>
              </thead>
              <tbody>
                {(data?.topPages ?? []).length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-stone-500">
                      No page views yet. Browse the public site to collect data.
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
              Top Stories
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="border-b border-[#E8E4DC] bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">Story</th>
                  <th className="px-4 py-3">Views</th>
                  <th className="px-4 py-3">Avg time</th>
                </tr>
              </thead>
              <tbody>
                {(data?.topStories ?? []).length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-stone-500">
                      No story reads yet for this period.
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
    </div>
  )
}
