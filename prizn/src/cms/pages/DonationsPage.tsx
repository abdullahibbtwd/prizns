import {
  CmsCard,
  CmsPageHeader,
  StatusPill,
  StatCard,
} from '@/cms/components/CmsUI'
import { cmsDonations } from '@/cms/data/mock'
import { HeartHandshake, TrendingUp, DollarSign } from 'lucide-react'

export default function CmsDonationsPage() {
  const total = cmsDonations
    .filter((d) => d.status === 'completed')
    .reduce((sum, d) => sum + d.amount, 0)
  const month = total
  const today = cmsDonations
    .filter((d) => d.createdAt === '2026-08-05' && d.status === 'completed')
    .reduce((sum, d) => sum + d.amount, 0)

  return (
    <div>
      <CmsPageHeader
        title="Donations & Grants"
        description="Track financial backing for field reporting, reading rooms, and looms."
        badge={`${cmsDonations.length} Active Donors`}
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Today's Support"
          value={`${today} BGN`}
          trend="+25 BGN"
          trendType="up"
          hint="Daily contributions"
          icon={HeartHandshake}
          sparklineData={[10, 15, 20, 25]}
        />
        <StatCard
          title="This Month"
          value={`${month} BGN`}
          trend="+18.4%"
          trendType="up"
          hint="Monthly campaign total"
          icon={TrendingUp}
          sparklineData={[120, 180, 240, 285]}
        />
        <StatCard
          title="Lifetime Campaign Total"
          value={`${total + 4820} BGN`}
          trend="Target 10,000 BGN"
          trendType="up"
          hint="All campaigns combined"
          icon={DollarSign}
          sparklineData={[2000, 3500, 4200, 5095]}
        />
      </div>

      <CmsCard className="overflow-hidden">
        <div className="border-b border-[#E8E4DC] bg-[#FAF8F3] px-6 py-4 flex items-center justify-between">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-stone-700">Recent Transactions Log</h2>
          <span className="text-xs font-semibold text-stone-500">Live Financial Ledger</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E8E4DC] bg-[#FAF8F3] font-heading text-xs uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-6 py-3.5 font-bold">Contributor</th>
                <th className="px-6 py-3.5 font-bold">Amount</th>
                <th className="px-6 py-3.5 font-bold">Target Campaign</th>
                <th className="px-6 py-3.5 font-bold">Status</th>
                <th className="px-6 py-3.5 font-bold">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E4DC]">
              {cmsDonations.map((d) => (
                <tr key={d.id} className="hover:bg-stone-50/80 transition-colors">
                  <td className="px-6 py-4 font-bold text-stone-900">{d.name}</td>
                  <td className="px-6 py-4 font-bold text-[#0C2686]">{d.amount} BGN</td>
                  <td className="px-6 py-4 font-semibold text-stone-700">{d.campaign}</td>
                  <td className="px-6 py-4">
                    <StatusPill status={d.status} />
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-stone-500">{d.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CmsCard>
    </div>
  )
}

