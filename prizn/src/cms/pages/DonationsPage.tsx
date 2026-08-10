import { useQuery } from '@tanstack/react-query'
import { HeartHandshake } from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
  StatusPill,
} from '@/cms/components/CmsUI'
import { listCmsDonations } from '@/lib/donations-api'

export default function CmsDonationsPage() {
  const listQuery = useQuery({
    queryKey: ['cms-donations'],
    queryFn: () => listCmsDonations({ pageSize: 50 }),
  })

  const items = listQuery.data?.items ?? []
  const total = listQuery.data?.total ?? items.length

  return (
    <div>
      <CmsPageHeader
        title="Donations & Grants"
        description="Track financial backing for field reporting, reading rooms, and looms."
        badge={`${total} Donations`}
      />

      {listQuery.isError && (
        <CmsCard className="mb-6 p-6 text-sm text-rose-700">
          Failed to load donations. {(listQuery.error as Error).message}
        </CmsCard>
      )}

      <CmsCard hover={false} className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-[#E8E4DC] bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-stone-500">
                    Loading…
                  </td>
                </tr>
              )}
              {!listQuery.isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-stone-500">
                    <span className="inline-flex items-center gap-2">
                      <HeartHandshake className="size-4" />
                      No donations yet.
                    </span>
                  </td>
                </tr>
              )}
              {items.map((row) => (
                <tr key={row.id} className="border-b border-[#E8E4DC]/70">
                  <td className="px-4 py-3 font-medium text-stone-900">
                    {(row.amountCents / 100).toFixed(2)}{' '}
                    <span className="text-xs uppercase text-stone-500">
                      BGN
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-700">
                    {row.email || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={row.status} />
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {new Date(row.createdAt).toLocaleString()}
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
