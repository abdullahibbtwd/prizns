import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

const KIND_OPTIONS: Array<{ value: TagKind; label: string; hint: string }> = [
  { value: 'LOCATION', label: 'Location', hint: 'Village or town' },
  { value: 'TOPIC', label: 'Topic', hint: 'Crafts, food, memory…' },
  { value: 'CATEGORY', label: 'Category', hint: 'Editorial grouping' },
]

export default function CmsTagsPage() {
  const queryClient = useQueryClient()
  const [kind, setKind] = useState<TagKind>('LOCATION')
  const [nameBg, setNameBg] = useState('')
  const [filterKind, setFilterKind] = useState<TagKind | ''>('')
  const [toast, setToast] = useState<{
    open: boolean
    variant: 'success' | 'error'
    message: string
  }>({ open: false, variant: 'success', message: '' })

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
      setToast({ open: true, variant: 'success', message: 'Tag created.' })
    },
    onError: (err: Error) => {
      setToast({
        open: true,
        variant: 'error',
        message: err.message || 'Failed to create tag.',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCmsTag(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cms-tags'] })
      setToast({ open: true, variant: 'success', message: 'Tag deleted.' })
    },
    onError: (err: Error) => {
      setToast({
        open: true,
        variant: 'error',
        message: err.message || 'Failed to delete tag.',
      })
    },
  })

  return (
    <div>
      <CmsPageHeader
        title="Tags"
        description="Create location, topic, and category tags. Attach them to stories in the story editor."
        badge={`${tags.length} tags`}
      />

      <Alert
        open={toast.open}
        variant={toast.variant}
        message={toast.message}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />

      <CmsCard className="mb-6 space-y-5 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-800">
          <Tags className="size-4 text-[#0C2686]" />
          Create tag
        </h2>

        <CmsField label="Kind">
          <CmsRadioGroup className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {KIND_OPTIONS.map((option) => (
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
          <CmsField label="Name">
            <CmsInput
              value={nameBg}
              onChange={(e) => setNameBg(e.target.value)}
              placeholder="e.g. Лом or Lom"
            />
          </CmsField>
          <div className="flex items-end">
            <PrimaryButton
              type="button"
              disabled={!nameBg.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="w-full md:min-w-[7.5rem]"
            >
              {createMutation.isPending ? 'Saving…' : 'Create'}
            </PrimaryButton>
          </div>
        </div>
      </CmsCard>

      <div className="mb-4 max-w-xs">
        <CmsField label="Filter">
          <JournalSelect
            name="filterKind"
            variant="boxed"
            label="Filter"
            placeholder="All kinds"
            options={[
              { value: '', label: 'All kinds' },
              ...KIND_OPTIONS.map(({ value, label }) => ({ value, label })),
            ]}
            value={filterKind}
            onChange={(value) => setFilterKind(value as TagKind | '')}
          />
        </CmsField>
      </div>

      {listQuery.isLoading ? (
        <CmsCard className="p-6 text-sm text-stone-500">Loading tags…</CmsCard>
      ) : tags.length === 0 ? (
        <CmsCard className="p-6 text-sm text-stone-500">
          No tags yet. Create the first one above.
        </CmsCard>
      ) : (
        <div className="space-y-4">
          {(Object.keys(grouped) as TagKind[]).map((groupKind) => {
            const items = grouped[groupKind]
            if (!items.length) return null
            return (
              <CmsCard key={groupKind} className="overflow-hidden p-0">
                <div className="border-b border-[#E8E4DC] bg-stone-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                  {groupKind}
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
                          if (window.confirm(`Delete tag “${tag.nameBg}”?`)) {
                            deleteMutation.mutate(tag.id)
                          }
                        }}
                        aria-label={`Delete ${tag.nameBg}`}
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
