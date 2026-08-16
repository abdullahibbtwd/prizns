import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  FileText,
  Link2,
  MapPin,
  Search,
  Share2,
  Sparkles,
  Type,
} from 'lucide-react'
import { CmsCard, CmsPageHeader, StatCard } from '@/cms/components/CmsUI'
import { useJournalLang } from '@/hooks/useJournalLang'
import { getCmsSeoOverview } from '@/lib/seo-api'
import { getSectionLabel } from '@/lib/section-i18n'
import { pickLang } from '@/lib/pick-lang'
import { cn } from '@/lib/utils'

export default function CmsSeoPage() {
  const { t } = useTranslation()
  const { lang } = useJournalLang()
  const overviewQuery = useQuery({
    queryKey: ['cms-seo-overview'],
    queryFn: getCmsSeoOverview,
  })

  const data = overviewQuery.data
  const coveragePct = data?.coveragePct ?? 0
  const uniqueMetaOk =
    (data?.missingTitle ?? 0) === 0 && (data?.missingDescription ?? 0) === 0

  return (
    <div>
      <CmsPageHeader
        title={t('cms.seoDesk.title')}
        description={t('cms.seoDesk.description')}
        badge={t('cms.seoDesk.badge', { count: coveragePct })}
      />

      {overviewQuery.isError && (
        <CmsCard className="mb-6 p-6 text-sm text-rose-700">
          {t('cms.seoDesk.loadFailed')} {(overviewQuery.error as Error).message}
        </CmsCard>
      )}

      <CmsCard className="mb-6 p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#0C2686]/10 text-[#0C2686]">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold text-stone-900">
              {t('cms.seoDesk.strategyTitle')}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-stone-600">
              {t('cms.seoDesk.strategyBody')}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <ArchiveChip
                href="/traditions"
                label={t('cms.seoDesk.traditions')}
                countLabel={t('cms.seoDesk.publishedCount', {
                  count: data?.evergreen.traditions ?? 0,
                })}
              />
              <ArchiveChip
                href="/places"
                label={t('cms.seoDesk.places')}
                countLabel={t('cms.seoDesk.publishedCount', {
                  count: data?.evergreen.places ?? 0,
                })}
                icon={MapPin}
              />
            </div>
          </div>
        </div>
      </CmsCard>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t('cms.seoDesk.published')}
          value={(data?.published ?? 0).toLocaleString()}
          hint={t('cms.seoDesk.publishedHint')}
          icon={FileText}
        />
        <StatCard
          title={t('cms.seoDesk.withMeta')}
          value={(data?.withUniqueMeta ?? 0).toLocaleString()}
          hint={t('cms.seoDesk.withMetaHint')}
          icon={CheckCircle2}
          trendType="up"
        />
        <StatCard
          title={t('cms.seoDesk.missingTitle')}
          value={(data?.missingTitle ?? 0).toLocaleString()}
          hint={t('cms.seoDesk.missingTitleHint')}
          icon={Type}
          trendType={(data?.missingTitle ?? 0) > 0 ? 'down' : 'up'}
        />
        <StatCard
          title={t('cms.seoDesk.missingDescription')}
          value={(data?.missingDescription ?? 0).toLocaleString()}
          hint={t('cms.seoDesk.missingDescriptionHint')}
          icon={CircleAlert}
          trendType={(data?.missingDescription ?? 0) > 0 ? 'down' : 'up'}
        />
      </div>

      <h2 className="mb-3 font-heading text-lg font-semibold text-stone-900">
        {t('cms.seoDesk.technicalTitle')}
      </h2>
      <div className="mb-8 grid gap-3 md:grid-cols-2">
        <ChecklistItem
          live
          title={t('cms.seoDesk.cleanUrls')}
          hint={t('cms.seoDesk.cleanUrlsHint')}
          icon={Link2}
        />
        <ChecklistItem
          live
          title={t('cms.seoDesk.schema')}
          hint={t('cms.seoDesk.schemaHint')}
          icon={FileText}
        />
        <ChecklistItem
          live
          title={t('cms.seoDesk.og')}
          hint={t('cms.seoDesk.ogHint')}
          icon={Share2}
        />
        <ChecklistItem
          live
          title={t('cms.seoDesk.sitemap')}
          hint={t('cms.seoDesk.sitemapHint')}
          icon={Search}
          href={data?.sitemapUrl}
          hrefLabel={t('cms.seoDesk.openSitemap')}
        />
        <ChecklistItem
          live
          title={t('cms.seoDesk.canonical')}
          hint={t('cms.seoDesk.canonicalHint')}
          icon={Link2}
        />
        <ChecklistItem
          live={uniqueMetaOk}
          title={t('cms.seoDesk.uniqueMeta')}
          hint={
            uniqueMetaOk
              ? t('cms.seoDesk.uniqueMetaOk')
              : t('cms.seoDesk.uniqueMetaGap', {
                  count:
                    (data?.published ?? 0) - (data?.withUniqueMeta ?? 0),
                })
          }
          icon={Type}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold text-stone-900">
          {t('cms.seoDesk.gapsTitle')}
        </h2>
        {data ? (
          <div className="flex flex-wrap gap-3 text-xs font-semibold">
            <a
              href={data.sitemapUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[#0C2686] hover:underline"
            >
              {t('cms.seoDesk.openSitemap')}
              <ExternalLink className="size-3" />
            </a>
            <a
              href={data.robotsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[#0C2686] hover:underline"
            >
              {t('cms.seoDesk.openRobots')}
              <ExternalLink className="size-3" />
            </a>
            <a
              href={data.feedUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[#0C2686] hover:underline"
            >
              {t('cms.seoDesk.openFeed')}
              <ExternalLink className="size-3" />
            </a>
          </div>
        ) : null}
      </div>

      {overviewQuery.isLoading && (
        <p className="text-sm text-stone-500">{t('cms.seoDesk.loading')}</p>
      )}

      {!overviewQuery.isLoading && data && data.published === 0 && (
        <CmsCard className="p-8 text-center text-sm text-stone-500">
          {t('cms.seoDesk.emptyPublished')}
        </CmsCard>
      )}

      {!overviewQuery.isLoading && data && data.published > 0 && data.gaps.length === 0 && (
        <CmsCard className="p-8 text-center text-sm text-emerald-800">
          {t('cms.seoDesk.gapsEmpty')}
        </CmsCard>
      )}

      {data && data.gaps.length > 0 && (
        <CmsCard className="overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E8E4DC] bg-stone-50 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-4 py-3">{t('cms.seoDesk.colStory')}</th>
                <th className="hidden px-4 py-3 md:table-cell">
                  {t('cms.seoDesk.colPath')}
                </th>
                <th className="px-4 py-3">{t('cms.seoDesk.colMissing')}</th>
                <th className="px-4 py-3 text-right">{t('cms.seoDesk.colAction')}</th>
              </tr>
            </thead>
            <tbody>
              {data.gaps.map((gap) => (
                <tr
                  key={gap.id}
                  className="border-b border-[#E8E4DC] last:border-0"
                >
                  <td className="px-4 py-3">
                    <p className="text-[11px] uppercase tracking-wider text-stone-500">
                      {getSectionLabel(gap.section, lang)}
                    </p>
                    <p className="font-medium text-stone-900">
                      {pickLang(lang, gap.titleEn, gap.titleBg)}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-xs text-stone-500 md:table-cell">
                    {gap.path}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {!gap.hasTitle ? (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-800">
                          {t('cms.seoDesk.missingTitleLabel')}
                        </span>
                      ) : null}
                      {!gap.hasDescription ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                          {t('cms.seoDesk.missingDescLabel')}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/cms/stories/${gap.id}`}
                      className="text-sm font-semibold text-[#0C2686] hover:underline"
                    >
                      {t('cms.seoDesk.edit')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CmsCard>
      )}
    </div>
  )
}

function ArchiveChip({
  href,
  label,
  countLabel,
  icon: Icon,
}: {
  href: string
  label: string
  countLabel: string
  icon?: typeof MapPin
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-xl border border-[#E8E4DC] bg-white px-3 py-2 text-sm text-stone-700 shadow-2xs transition hover:border-[#0C2686]/30 hover:text-stone-900"
    >
      {Icon ? <Icon className="size-4 text-[#0C2686]" /> : <Sparkles className="size-4 text-[#0C2686]" />}
      <span className="font-semibold">{label}</span>
      <span className="text-xs text-stone-500">{countLabel}</span>
    </a>
  )
}

function ChecklistItem({
  live,
  title,
  hint,
  icon: Icon,
  href,
  hrefLabel,
}: {
  live: boolean
  title: string
  hint: string
  icon: typeof Search
  href?: string
  hrefLabel?: string
}) {
  const { t } = useTranslation()
  return (
    <CmsCard className="flex items-start gap-3 p-4">
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-xl',
          live
            ? 'bg-emerald-50 text-emerald-800'
            : 'bg-amber-50 text-amber-800',
        )}
      >
        {live ? (
          <CheckCircle2 className="size-4.5" />
        ) : (
          <CircleAlert className="size-4.5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Icon className="size-3.5 text-stone-400" />
          <p className="font-semibold text-stone-900">{title}</p>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
              live
                ? 'bg-emerald-50 text-emerald-800'
                : 'bg-amber-50 text-amber-800',
            )}
          >
            {live ? t('cms.seoDesk.live') : t('cms.seoDesk.needsWork')}
          </span>
        </div>
        <p className="mt-1 text-sm text-stone-600">{hint}</p>
        {href && hrefLabel ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#0C2686] hover:underline"
          >
            {hrefLabel}
            <ExternalLink className="size-3" />
          </a>
        ) : null}
      </div>
    </CmsCard>
  )
}
