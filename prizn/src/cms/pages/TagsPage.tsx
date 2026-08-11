import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Tags, Trash2 } from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
  PrimaryButton,
} from '@/cms/components/CmsUI'
import {
  CmsField,
  CmsInput,
  CmsRadio,
  CmsRadioGroup,
} from '@/cms/components/CmsFields'
import { JournalSelect } from '@/components/ui/JournalSelect'
import { Alert } from '@/components/ui/Alert'
import {
  createCmsTag,
  deleteCmsTag,
  listCmsTags,
  type TagKind,
} from '@/lib/tags-api'

const KIND_VALUES: TagKind[] = ['LOCATION', 'TOPIC', 'CATEGORY']

export default function CmsTagsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [kind, setKind] = useState<TagKind>('LOCATION')
  const [nameBg, setNameBg] = useState('')
  const [filterKind, setFilterKind] = useState<TagKind | ''>('')
  const [toast, setToast] = useState<{
    open: boolean
    variant: 'success' | 'error'
    message: string
  }>({ open: false, variant: 'success', message: '' })

  const kindOptions = useMemo(
    () => [
      {
        value: 'LOCATION' as const,
        label: t('cms.tags.kindLocation'),
        hint: t('cms.tags.kindLocationHint'),
      },
      {
        value: 'TOPIC' as const,
        label: t('cms.tags.kindTopic'),
        hint: t('cms.tags.kindTopicHint'),
      },
      {
        value: 'CATEGORY' as const,
        label: t('cms.tags.kindCategory'),
        hint: t('cms.tags.kindCategoryHint'),
      },
    ],
    [t],
  )

  const kindLabel = (value: TagKind) =>
    kindOptions.find((o) => o.value === value)?.label ?? value

  const listQuery = useQuery({
    queryKey: ['cms-tags', filterKind || 'all'],
    queryFn: () => listCmsTags(filterKind || undefined),
  })

  const tags = listQuery.data ?? []
  const grouped = useMemo(() => {
    const groups: Record<TagKind, typeof tags> = {
      LOCATION: [],
      TOPIC: [],
      CATEGORY: [],
    }
    for (const tag of tags) {
      groups[tag.kind]?.push(tag)
    }
    return groups
  }, [tags])

  const createMutation = useMutation({
    mutationFn: () =>
      createCmsTag({
        kind,
        nameBg: nameBg.trim(),
      }),
    onSuccess: async () => {
      setNameBg('')
      await queryClient.invalidateQueries({ queryKey: ['cms-tags'] })
      setToast({ open: true, variant: 'success', message: t('cms.tags.created') })
    },
    onError: (err: Error) => {
      setToast({
        open: true,
        variant: 'error',
        message: err.message || t('cms.tags.createFailed'),
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCmsTag(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cms-tags'] })
      setToast({ open: true, variant: 'success', message: t('cms.tags.deleted') })
    },
    onError: (err: Error) => {
      setToast({
        open: true,
        variant: 'error',
        message: err.message || t('cms.tags.deleteFailed'),
      })
    },
  })

  return (
    <div>
      <CmsPageHeader
        title={t('cms.tags.title')}
        description={t('cms.tags.description')}
        badge={t('cms.tags.badge', { count: tags.length })}
      />

      <Alert
        open={toast.open}
        variant={toast.variant}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      <CmsCard className="mb-6 space-y-5 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-800">
          <Tags className="size-4 text-[#0C2686]" />
          {t('cms.tags.createTitle')}
        </h2>

        <CmsField label={t('cms.tags.kind')}>
          <CmsRadioGroup className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {kindOptions.map((option) => (
              <CmsRadio
                key={option.value}
                name="tag-kind"
                checked={kind === option.value}
                onChange={() => setKind(option.value)}
                label={option.label}
                description={option.hint}
              />
            ))}
          </CmsRadioGroup>
        </CmsField>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
          <CmsField label={t('cms.tags.name')}>
            <CmsInput
              value={nameBg}
              onChange={(e) => setNameBg(e.target.value)}
              placeholder={t('cms.tags.namePlaceholder')}
            />
          </CmsField>
          <div className="flex items-end">
            <PrimaryButton
              type="button"
              disabled={!nameBg.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="w-full md:min-w-[7.5rem]"
            >
              {createMutation.isPending
                ? t('cms.common.saving')
                : t('cms.common.create')}
            </PrimaryButton>
          </div>
        </div>
      </CmsCard>

      <div className="mb-4 max-w-xs">
        <CmsField label={t('cms.tags.filter')}>
          <JournalSelect
            name="filterKind"
            variant="boxed"
            label={t('cms.tags.filter')}
            placeholder={t('cms.tags.allKinds')}
            options={[
              { value: '', label: t('cms.tags.allKinds') },
              ...kindOptions.map(({ value, label }) => ({ value, label })),
            ]}
            value={filterKind}
            onChange={(value) => setFilterKind(value as TagKind | '')}
          />
        </CmsField>
      </div>

      {listQuery.isLoading ? (
        <CmsCard className="p-6 text-sm text-stone-500">
          {t('cms.tags.loading')}
        </CmsCard>
      ) : tags.length === 0 ? (
        <CmsCard className="p-6 text-sm text-stone-500">
          {t('cms.tags.empty')}
        </CmsCard>
      ) : (
        <div className="space-y-4">
          {KIND_VALUES.map((groupKind) => {
            const items = grouped[groupKind]
            if (!items.length) return null
            return (
              <CmsCard key={groupKind} className="overflow-hidden p-0">
                <div className="border-b border-[#E8E4DC] bg-stone-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                  {kindLabel(groupKind)}
                </div>
                <ul className="divide-y divide-[#E8E4DC]/70">
                  {items.map((tag) => (
                    <li
                      key={tag.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-stone-900">
                          {tag.nameBg}
                        </p>
                        <p className="text-xs text-stone-500">
                          {tag.nameEn || '—'} · /{tag.slug}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="rounded-lg border border-[#E8E4DC] p-2 text-stone-500 transition-colors hover:border-rose-200 hover:text-rose-600"
                        onClick={() => {
                          if (
                            window.confirm(
                              t('cms.tags.deleteConfirm', { name: tag.nameBg }),
                            )
                          ) {
                            deleteMutation.mutate(tag.id)
                          }
                        }}
                        aria-label={t('cms.tags.deleteConfirm', {
                          name: tag.nameBg,
                        })}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </CmsCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
