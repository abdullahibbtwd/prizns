import { useEffect, useMemo, useState } from 'react'
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
import { useCmsConfirm } from '@/cms/components/CmsConfirmDialog'
import {
  createCmsTag,
  deleteCmsTag,
  geocodeCmsTag,
  listCmsTags,
  updateCmsTag,
  type CmsTag,
  type TagKind,
} from '@/lib/tags-api'

const KIND_VALUES: TagKind[] = ['LOCATION', 'TOPIC', 'CATEGORY']

export default function CmsTagsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { confirm, dialog } = useCmsConfirm()
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

  const coordsMutation = useMutation({
    mutationFn: (input: { id: string; lat: number; lng: number }) =>
      updateCmsTag(input.id, { lat: input.lat, lng: input.lng }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cms-tags'] })
      setToast({
        open: true,
        variant: 'success',
        message: t('cms.tags.coordsSaved'),
      })
    },
    onError: (err: Error) => {
      setToast({
        open: true,
        variant: 'error',
        message: err.message || t('cms.tags.createFailed'),
      })
    },
  })

  const geocodeMutation = useMutation({
    mutationFn: (id: string) => geocodeCmsTag(id),
    onSuccess: async (tag) => {
      await queryClient.invalidateQueries({ queryKey: ['cms-tags'] })
      setToast({
        open: true,
        variant: tag.geocodeStatus === 'ok' ? 'success' : 'error',
        message:
          tag.geocodeStatus === 'ok'
            ? t('cms.tags.geocodeOk')
            : t('cms.tags.geocodeFailed'),
      })
    },
    onError: (err: Error) => {
      setToast({
        open: true,
        variant: 'error',
        message: err.message || t('cms.tags.geocodeFailed'),
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
                      className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-stone-900">
                          {tag.nameBg}
                        </p>
                        <p className="text-xs text-stone-500">
                          {tag.nameEn || '—'} · /{tag.slug}
                          {groupKind === 'LOCATION' ? (
                            <>
                              {' '}
                              ·{' '}
                              {tag.lat != null && tag.lng != null
                                ? t('cms.tags.mapped')
                                : t('cms.tags.unmapped')}
                            </>
                          ) : null}
                        </p>
                        {groupKind === 'LOCATION' ? (
                          <LocationCoords
                            tag={tag}
                            disabled={
                              coordsMutation.isPending ||
                              geocodeMutation.isPending
                            }
                            onSave={(lat, lng) =>
                              coordsMutation.mutate({ id: tag.id, lat, lng })
                            }
                            onGeocode={() => geocodeMutation.mutate(tag.id)}
                          />
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="rounded-lg border border-[#E8E4DC] p-2 text-stone-500 transition-colors hover:border-rose-200 hover:text-rose-600"
                        onClick={async () => {
                          const ok = await confirm({
                            title: t('cms.common.delete'),
                            description: t('cms.tags.deleteConfirm', {
                              name: tag.nameBg,
                            }),
                          })
                          if (ok) deleteMutation.mutate(tag.id)
                        }}
                        aria-label={`${t('cms.common.delete')}: ${tag.nameBg}`}
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
      {dialog}
    </div>
  )
}

function LocationCoords({
  tag,
  disabled,
  onSave,
  onGeocode,
}: {
  tag: CmsTag
  disabled: boolean
  onSave: (lat: number, lng: number) => void
  onGeocode: () => void
}) {
  const { t } = useTranslation()
  const hasCoords = tag.lat != null && tag.lng != null
  const [editing, setEditing] = useState(!hasCoords)
  const [lat, setLat] = useState(tag.lat != null ? String(tag.lat) : '')
  const [lng, setLng] = useState(tag.lng != null ? String(tag.lng) : '')

  useEffect(() => {
    setLat(tag.lat != null ? String(tag.lat) : '')
    setLng(tag.lng != null ? String(tag.lng) : '')
    setEditing(tag.lat == null || tag.lng == null)
  }, [tag.lat, tag.lng])

  const latNum = Number(lat)
  const lngNum = Number(lng)
  const canSave = Number.isFinite(latNum) && Number.isFinite(lngNum)

  if (!editing) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="text-xs text-stone-500">
          {tag.lat}, {tag.lng}
        </p>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setEditing(true)}
          className="rounded-lg border border-[#E8E4DC] px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-[#0C2686]/30 disabled:opacity-50"
        >
          {t('cms.tags.editCoords')}
        </button>
      </div>
    )
  }

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <label className="space-y-1 text-[11px] text-stone-500">
        {t('cms.tags.lat')}
        <input
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          inputMode="decimal"
          className="block w-28 rounded-lg border border-[#E8E4DC] px-2 py-1.5 text-sm text-stone-800"
        />
      </label>
      <label className="space-y-1 text-[11px] text-stone-500">
        {t('cms.tags.lng')}
        <input
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          inputMode="decimal"
          className="block w-28 rounded-lg border border-[#E8E4DC] px-2 py-1.5 text-sm text-stone-800"
        />
      </label>
      <button
        type="button"
        disabled={disabled || !canSave}
        onClick={() => onSave(latNum, lngNum)}
        className="rounded-lg border border-[#E8E4DC] px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-[#0C2686]/30 disabled:opacity-50"
      >
        {t('cms.tags.saveCoords')}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onGeocode}
        className="rounded-lg border border-[#E8E4DC] px-3 py-1.5 text-xs font-semibold text-[#0C2686] hover:border-[#0C2686]/30 disabled:opacity-50"
      >
        {t('cms.tags.geocode')}
      </button>
      {hasCoords ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setEditing(false)}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-stone-500 hover:text-stone-700 disabled:opacity-50"
        >
          {t('cms.tags.cancelCoords')}
        </button>
      ) : null}
    </div>
  )
}
