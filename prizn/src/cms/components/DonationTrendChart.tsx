import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '@/lib/utils'
import {
  getCmsDonationTrend,
  type DonationChartGranularity,
} from '@/lib/donations-api'

function formatLev(n: number, locale: string) {
  return `${n.toLocaleString(locale, { maximumFractionDigits: 0 })} лв.`
}

function formatPointLabel(
  key: string,
  granularity: DonationChartGranularity,
  locale: string,
) {
  if (granularity === 'year') return key
  if (granularity === 'month') {
    const [y, m] = key.split('-').map(Number)
    if (!y || !m) return key
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(locale, {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    })
  }
  const [y, m, d] = key.split('-').map(Number)
  if (!y || !m || !d) return key
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

function ChartTooltip({
  active,
  payload,
  label,
  locale,
}: {
  active?: boolean
  payload?: Array<{ value?: number }>
  label?: string
  locale: string
}) {
  if (!active || !payload?.length) return null
  const value = Number(payload[0]?.value ?? 0)
  return (
    <div className="rounded-lg border border-[#E8E4DC]/90 bg-white/95 px-2.5 py-1.5 shadow-lg backdrop-blur-sm">
      <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
        {label}
      </p>
      <p className="font-heading text-sm font-semibold tabular-nums text-[#0C2686]">
        {formatLev(value, locale)}
      </p>
    </div>
  )
}

export function DonationTrendChart() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en-GB' : 'bg-BG'
  const [granularity, setGranularity] =
    useState<DonationChartGranularity>('day')

  const trendQuery = useQuery({
    queryKey: ['cms-donations-trend', granularity],
    queryFn: () => getCmsDonationTrend(granularity),
  })

  const data = useMemo(
    () =>
      (trendQuery.data?.series ?? []).map((p) => ({
        label: formatPointLabel(p.key, granularity, locale),
        amount: p.amountBgn,
      })),
    [trendQuery.data?.series, granularity, locale],
  )

  const monthTotal = trendQuery.data?.monthBgn ?? 0
  const todayTotal = trendQuery.data?.todayBgn ?? 0
  const seriesTotal = trendQuery.data?.rangeBgn ?? 0

  const granLabels: Record<DonationChartGranularity, string> = {
    day: t('cms.donations.days'),
    month: t('cms.donations.months'),
    year: t('cms.donations.years'),
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E8E4DC] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <p className="font-heading text-xl font-extrabold tracking-tight text-stone-900 sm:text-2xl">
              {trendQuery.isLoading ? '…' : formatLev(monthTotal, locale)}
            </p>
            <p className="text-xs text-stone-500">
              {t('cms.donations.thisMonth')}
              <span className="mx-1.5 text-stone-300">·</span>
              {t('cms.donations.today')}{' '}
              {trendQuery.isLoading ? '…' : formatLev(todayTotal, locale)}
            </p>
          </div>
          {trendQuery.isError ? (
            <p className="mt-1 text-xs text-rose-600">
              {t('cms.donations.trendFailed')}{' '}
              {(trendQuery.error as Error).message}
            </p>
          ) : null}
        </div>

        <div className="flex items-center rounded-lg border border-[#E8E4DC] bg-[#FDFBF7] p-0.5">
          {(['day', 'month', 'year'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setGranularity(id)}
              className={cn(
                'rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors',
                granularity === id
                  ? 'bg-[#0C2686] text-white'
                  : 'text-stone-500 hover:text-stone-800',
              )}
            >
              {granLabels[id]}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[128px] w-full px-1 pb-1 sm:h-[140px] sm:px-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="donationArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0C2686" stopOpacity={0.28} />
                <stop offset="55%" stopColor="#0C2686" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#0C2686" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="#EDE9E2"
              strokeDasharray="3 6"
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#A8A29E', fontSize: 10 }}
              interval="preserveStartEnd"
              minTickGap={28}
              dy={4}
            />
            <YAxis
              width={36}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#A8A29E', fontSize: 10 }}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
              }
            />
            <Tooltip
              content={<ChartTooltip locale={locale} />}
              cursor={{
                stroke: '#0C2686',
                strokeWidth: 1,
                strokeOpacity: 0.25,
                strokeDasharray: '4 4',
              }}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#0C2686"
              strokeWidth={2}
              fill="url(#donationArea)"
              dot={false}
              activeDot={{
                r: 4,
                fill: '#0C2686',
                stroke: '#fff',
                strokeWidth: 2,
              }}
              isAnimationActive
              animationDuration={700}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between px-4 pb-3 pt-1 text-[10px] font-medium uppercase tracking-wider text-stone-400 sm:px-5">
        <span>
          {t('cms.donations.range')} · {formatLev(seriesTotal, locale)}
        </span>
        <span>
          {granularity === 'day'
            ? t('cms.donations.last30Days')
            : granularity === 'month'
              ? t('cms.donations.last12Months')
              : t('cms.donations.byYear')}
        </span>
      </div>
    </div>
  )
}
