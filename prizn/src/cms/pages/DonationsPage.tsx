import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { HeartHandshake } from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
  StatusPill,
} from '@/cms/components/CmsUI'
import { DonationTrendChart } from '@/cms/components/DonationTrendChart'
import { listCmsDonations } from '@/lib/donations-api'
import { pickLang } from '@/lib/pick-lang'

export default function CmsDonationsPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'bg'

  const listQuery = useQuery({
    queryKey: ['cms-donations', 'COMPLETED'],
    queryFn: () =>
      listCmsDonations({ pageSize: 50, status: 'COMPLETED' }),
  })

  const items = listQuery.data?.items ?? []

  return (
    <div>
      <CmsPageHeader title={t('cms.donations.title')} />

      <div className="mb-8">
        <DonationTrendChart />
      </div>

      {listQuery.isError && (
        <CmsCard className="mb-6 p-6 text-sm text-rose-700">
          {t('cms.donations.loadFailed')}{' '}
          {(listQuery.error as Error).message}
        </CmsCard>
      )}

      <CmsCard hover={false} className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-[#E8E4DC] bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-4 py-3">{t('cms.donations.colAmount')}</th>
                <th className="px-4 py-3">{t('cms.donations.colStory')}</th>
                <th className="px-4 py-3">{t('cms.donations.colEmail')}</th>
                <th className="px-4 py-3">{t('cms.donations.colStatus')}</th>
                <th className="px-4 py-3">{t('cms.donations.colDate')}</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-stone-500">
                    {t('cms.donations.loading')}
                  </td>
                </tr>
              )}
              {!listQuery.isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-stone-500">
                    <span className="inline-flex items-center gap-2">
                      <HeartHandshake className="size-4" />
                      {t('cms.donations.empty')}
                    </span>
                  </td>
                </tr>
              )}
              {items.map((row) => (
                <tr key={row.id} className="border-b border-[#E8E4DC]/70">
                  <td className="px-4 py-3 font-medium text-stone-900">
                    {(row.amountCents / 100).toFixed(2)}{' '}
                    <span className="text-xs uppercase text-stone-500">
                      {row.currency?.toLowerCase() === 'eur' ? 'EUR' : 'лв.'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-700">
                    {row.article ? (
                      <a
                        href={row.article.path}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#0C2686] hover:underline"
                      >
                        {pickLang(
                          lang,
                          row.article.titleEn,
                          row.article.titleBg,
                        )}
                      </a>
                    ) : (
                      <span className="text-stone-400">
                        {t('cms.donations.general')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-700">
                    {row.email || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={row.status} />
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {new Date(row.createdAt).toLocaleString(
                      lang === 'bg' ? 'bg-BG' : 'en-GB',
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CmsCard>
    </div>
  )
}
