import {
  CmsCard,
  CmsPageHeader,
  StatusPill,
} from '@/cms/components/CmsUI'
import { cmsPartnerships } from '@/cms/data/mock'
import { Building2, UserCheck, Calendar } from 'lucide-react'

const pipeline = ['new', 'contacted', 'negotiating', 'won', 'lost'] as const

export default function CmsPartnershipsPage() {
  return (
    <div>
      <CmsPageHeader
        title="Partnerships & CRM Pipeline"
        description="Track alliances with regional tourism boards, ethnographic museums, wineries, and sponsors."
        badge={`${cmsPartnerships.length} Active Accounts`}
      />

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5">
        {pipeline.map((status) => {
          const count = cmsPartnerships.filter((p) => p.status === status).length
          return (
            <CmsCard key={status} className="p-5 flex flex-col justify-between">
              <span className="font-heading text-xs font-bold uppercase tracking-[0.18em] text-stone-500 capitalize">
                {status}
              </span>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="font-heading text-3xl font-bold text-stone-900">{count}</span>
                <StatusPill status={status} />
              </div>
            </CmsCard>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {cmsPartnerships.map((p) => (
          <CmsCard key={p.id} className="p-6">
            <div className="flex items-start justify-between gap-4 border-b border-[#E8E4DC] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-[#0C2686]/10 text-[#0C2686] shrink-0">
                  <Building2 className="size-5" />
                </div>
                <div>
                  <h2 className="font-heading text-xl font-bold text-stone-900">{p.business}</h2>
                  <p className="text-xs font-semibold text-stone-600 mt-0.5">
                    {p.type} Partnership
                  </p>
                </div>
              </div>
              <StatusPill status={p.status} />
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-stone-600">
              <span className="flex items-center gap-1.5 font-semibold text-stone-800">
                <UserCheck className="size-3.5 text-[#0C2686]" /> Contact: {p.contact}
              </span>
              <span className="flex items-center gap-1 text-stone-400">
                <Calendar className="size-3.5" /> Updated {p.updatedAt}
              </span>
            </div>
          </CmsCard>
        ))}
      </div>
    </div>
  )
}

