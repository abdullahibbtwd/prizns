import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Building2, Calendar, Mail, UserCheck } from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
  StatusPill,
} from '@/cms/components/CmsUI'
import { JournalSelect } from '@/components/ui/JournalSelect'
import {
  listCmsPartnerships,
  updateCmsPartnership,
  type PartnershipStatus,
} from '@/lib/partnerships-api'

const STATUS_OPTIONS: PartnershipStatus[] = [
  'NEW',
  'REVIEW',
  'CONTACTED',
  'CLOSED',
]

function excerpt(text: string, max = 140) {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max).trimEnd()}…`
}

export default function CmsPartnershipsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: ['cms-partnerships'],
    queryFn: () => listCmsPartnerships({ pageSize: 50 }),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string
      status: PartnershipStatus
    }) => updateCmsPartnership(id, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cms-partnerships'] })
    },
  })

  const items = listQuery.data?.items ?? []
  const total = listQuery.data?.total ?? items.length

  return (
    <div>
      <CmsPageHeader
        title={t('cms.partnerships.title')}
        description={t('cms.partnerships.description')}
        badge={t('cms.partnerships.badge', { count: total })}
      />

      {listQuery.isError && (
        <CmsCard className="mb-6 p-6 text-sm text-rose-700">
          {t('cms.partnerships.loadFailed')}{' '}
          {(listQuery.error as Error).message}
        </CmsCard>
      )}

      {listQuery.isLoading && (
        <CmsCard className="p-6 text-sm text-stone-500">
          {t('cms.partnerships.loading')}
        </CmsCard>
      )}

      {!listQuery.isLoading && items.length === 0 && (
        <CmsCard className="p-6 text-sm text-stone-500">
          {t('cms.partnerships.empty')}
        </CmsCard>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map((p) => (
          <CmsCard key={p.id} className="p-6">
            <div className="flex items-start justify-between gap-4 border-b border-[#E8E4DC] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#0C2686]/10 text-[#0C2686]">
                  <Building2 className="size-5" />
                </div>
                <div>
                  <h2 className="font-heading text-xl font-bold text-stone-900">
                    {p.organization}
                  </h2>
                  <p className="mt-0.5 text-xs font-semibold text-stone-600">
                    {p.type}
                  </p>
                </div>
              </div>
              <StatusPill status={p.status} />
            </div>

            <div className="mt-4 space-y-2 text-xs text-stone-600">
              <p className="flex items-center gap-1.5 font-semibold text-stone-800">
                <UserCheck className="size-3.5 text-[#0C2686]" />
                {p.contactName}
              </p>
              <p className="flex items-center gap-1.5">
                <Mail className="size-3.5 text-[#0C2686]" />
                {p.email}
              </p>
              <p className="leading-relaxed text-stone-700">
                {excerpt(p.message)}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#E8E4DC] pt-4">
              <span className="flex items-center gap-1 text-xs text-stone-400">
                <Calendar className="size-3.5" />
                {new Date(p.createdAt).toLocaleDateString()}
              </span>
              <div className="min-w-[10rem]">
                <JournalSelect
                  name={`partnership-status-${p.id}`}
                  label={t('cms.partnerships.status')}
                  placeholder={t('cms.partnerships.status')}
                  options={STATUS_OPTIONS.map((status) => ({
                    value: status,
                    label: t(`cms.status.${status.toLowerCase()}`),
                  }))}
                  value={p.status}
                  onChange={(value) =>
                    updateMutation.mutate({
                      id: p.id,
                      status: value as PartnershipStatus,
                    })
                  }
                />
              </div>
            </div>
          </CmsCard>
        ))}
      </div>
    </div>
  )
}
