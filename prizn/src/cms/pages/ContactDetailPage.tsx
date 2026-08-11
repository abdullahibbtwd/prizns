import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Calendar,
  Mail,
  Sparkles,
  Tag,
  User,
} from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
  GhostButton,
  StatusPill,
} from '@/cms/components/CmsUI'
import { CmsField, CmsTextarea } from '@/cms/components/CmsFields'
import { JournalSelect } from '@/components/ui/JournalSelect'
import { Alert } from '@/components/ui/Alert'
import {
  getCmsContact,
  updateCmsContact,
  type ContactCategory,
  type ContactStatus,
} from '@/lib/contact-api'
import { contactCategoryLabel } from '@/cms/pages/contact-labels'

const STATUS_OPTIONS: ContactStatus[] = ['NEW', 'REVIEW', 'REPLIED', 'CLOSED']

export default function CmsContactDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en-GB' : 'bg-BG'
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const [notes, setNotes] = useState('')
  const [toast, setToast] = useState<{
    open: boolean
    variant: 'success' | 'error'
    message: string
  }>({ open: false, variant: 'success', message: '' })

  const detailQuery = useQuery({
    queryKey: ['cms-contact-detail', id],
    queryFn: () => getCmsContact(id),
    enabled: Boolean(id),
  })

  const item = detailQuery.data

  useEffect(() => {
    if (item) setNotes(item.notes ?? '')
  }, [item?.id, item?.notes])

  const updateMutation = useMutation({
    mutationFn: (body: { status?: ContactStatus; notes?: string }) =>
      updateCmsContact(id, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['cms-contact-detail', id] }),
        queryClient.invalidateQueries({ queryKey: ['cms-contact'] }),
      ])
      setToast({
        open: true,
        variant: 'success',
        message: t('cms.contactDesk.saved'),
      })
    },
    onError: (err: Error) =>
      setToast({
        open: true,
        variant: 'error',
        message: err.message || t('cms.contactDesk.saveFailed'),
      }),
  })

  if (detailQuery.isLoading) {
    return (
      <div>
        <CmsPageHeader
          title={t('cms.nav.contact')}
          description={t('cms.contactDesk.detailLoading')}
        />
        <CmsCard className="p-6 text-sm text-stone-500">
          {t('cms.contactDesk.detailLoading')}
        </CmsCard>
      </div>
    )
  }

  if (detailQuery.isError || !item) {
    return (
      <div>
        <CmsPageHeader
          title={t('cms.nav.contact')}
          description={t('cms.contactDesk.detailNotFound')}
        />
        <CmsCard className="p-6 text-sm text-rose-700">
          {(detailQuery.error as Error)?.message ||
            t('cms.contactDesk.messageNotFound')}
          <div className="mt-4">
            <Link
              to="/cms/contact"
              className="font-semibold text-[#0C2686] hover:underline"
            >
              {t('cms.contactDesk.backToInbox')}
            </Link>
          </div>
        </CmsCard>
      </div>
    )
  }

  const category = (item.aiCategory ?? 'UNKNOWN') as ContactCategory

  return (
    <div>
      <Alert
        open={toast.open}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        variant={toast.variant}
        title={
          toast.variant === 'success'
            ? t('cms.contactDesk.saved')
            : t('cms.contactDesk.error')
        }
        message={toast.message}
      />

      <div className="mb-4">
        <Link
          to="/cms/contact"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#0C2686] hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          {t('cms.contactDesk.allMessages')}
        </Link>
      </div>

      <CmsPageHeader
        title={item.subject}
        description={`${item.name} · ${item.email}`}
        badge={contactCategoryLabel(category, t)}
        actions={<StatusPill status={item.status} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <CmsCard className="space-y-4 p-6">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-[#0C2686]/20 bg-[#0C2686]/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#0C2686]">
                <Tag className="size-3" />
                {contactCategoryLabel(category, t)}
              </span>
              {item.autoRepliedAt && (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
                  {t('cms.contactDesk.autoReplied')}
                </span>
              )}
            </div>

            {item.aiSummary && (
              <div className="rounded-xl border border-[#0C2686]/15 bg-[#0C2686]/5 p-4">
                <p className="mb-1.5 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#0C2686]">
                  <Sparkles className="size-3.5" />
                  {t('cms.contactDesk.aiTitle')}
                </p>
                <p className="text-sm leading-relaxed text-stone-700">
                  {item.aiSummary}
                </p>
              </div>
            )}

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                {t('cms.contactDesk.message')}
              </p>
              <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-stone-800">
                {item.message}
              </p>
            </div>
          </CmsCard>

          <CmsCard className="space-y-4 p-6">
            <CmsField label={t('cms.contactDesk.notes')}>
              <CmsTextarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder={t('cms.contactDesk.notesPlaceholder')}
              />
            </CmsField>
            <GhostButton
              disabled={
                updateMutation.isPending || notes === (item.notes ?? '')
              }
              onClick={() => updateMutation.mutate({ notes })}
            >
              {updateMutation.isPending
                ? t('cms.common.saving')
                : t('cms.contactDesk.saveNotes')}
            </GhostButton>
          </CmsCard>
        </div>

        <div className="space-y-4">
          <CmsCard className="space-y-3 p-5 text-sm text-stone-600">
            <p className="flex items-center gap-2">
              <User className="size-3.5 text-[#0C2686]" />
              {item.name}
            </p>
            <p className="flex items-center gap-2 break-all">
              <Mail className="size-3.5 text-[#0C2686]" />
              <a
                href={`mailto:${item.email}`}
                className="text-[#0C2686] hover:underline"
              >
                {item.email}
              </a>
            </p>
            <p className="flex items-center gap-2">
              <Calendar className="size-3.5 text-[#0C2686]" />
              {new Date(item.createdAt).toLocaleString(locale)}
            </p>
          </CmsCard>

          <CmsCard className="space-y-3 p-5">
            <JournalSelect
              name={`contact-detail-status-${item.id}`}
              label={t('cms.contactDesk.status')}
              placeholder={t('cms.contactDesk.status')}
              options={STATUS_OPTIONS.map((s) => ({
                value: s,
                label: t(`cms.status.${s.toLowerCase()}`),
              }))}
              value={item.status}
              onChange={(value) =>
                updateMutation.mutate({ status: value as ContactStatus })
              }
            />
          </CmsCard>
        </div>
      </div>
    </div>
  )
}
