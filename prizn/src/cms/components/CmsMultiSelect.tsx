import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronsUpDown, Plus, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CmsField, CmsInput } from '@/cms/components/CmsFields'
import { JournalSelect } from '@/components/ui/JournalSelect'
import type { CmsTag, TagKind } from '@/lib/tags-api'

export type CmsMultiSelectOption = {
  value: string
  label: string
  hint?: string
  group?: string
}

type CmsMultiSelectProps = {
  options: CmsMultiSelectOption[]
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  loading?: boolean
  className?: string
  /** Extra actions under the list (e.g. create new) */
  footer?: ReactNode
}

export function CmsMultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No matches',
  loading,
  className,
  footer,
}: CmsMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  const selected = useMemo(() => {
    const map = new Map(options.map((o) => [o.value, o]))
    return value
      .map((id) => map.get(id))
      .filter(Boolean) as CmsMultiSelectOption[]
  }, [options, value])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.hint?.toLowerCase().includes(q) ||
        o.group?.toLowerCase().includes(q),
    )
  }, [options, query])

  const grouped = useMemo(() => {
    const groups = new Map<string, CmsMultiSelectOption[]>()
    for (const option of filtered) {
      const key = option.group || ''
      const list = groups.get(key) ?? []
      list.push(option)
      groups.set(key, list)
    }
    return [...groups.entries()]
  }, [filtered])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      window.setTimeout(() => searchRef.current?.focus(), 20)
    } else {
      setQuery('')
    }
  }, [open])

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id))
    else onChange([...value, id])
  }

  const remove = (id: string) => onChange(value.filter((v) => v !== id))

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex min-h-[46px] w-full cursor-pointer flex-wrap items-center gap-2 rounded-xl border bg-white px-3 py-2 text-left shadow-2xs transition-all',
          open
            ? 'border-[#0C2686] ring-2 ring-[#0C2686]/10'
            : 'border-[#E8E4DC] hover:border-[#0C2686]/25',
        )}
      >
        {selected.length === 0 ? (
          <span className="flex-1 font-sans text-sm text-stone-400">
            {placeholder}
          </span>
        ) : (
          <div className="flex flex-1 flex-wrap gap-1.5">
            {selected.map((item) => (
              <span
                key={item.value}
                className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#0C2686]/15 bg-[#0C2686]/[0.06] px-2.5 py-1 font-sans text-[11px] font-medium text-[#0C2686]"
              >
                <span className="truncate">{item.label}</span>
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Remove ${item.label}`}
                  className="rounded-full p-0.5 hover:bg-[#0C2686]/10"
                  onClick={(e) => {
                    e.stopPropagation()
                    remove(item.value)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      e.stopPropagation()
                      remove(item.value)
                    }
                  }}
                >
                  <X className="size-3" />
                </span>
              </span>
            ))}
          </div>
        )}
        <ChevronsUpDown className="size-4 shrink-0 text-stone-400" />
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-multiselectable
          className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-[#E8E4DC] bg-[#FDFBF7] shadow-[0_16px_40px_rgba(0,0,0,0.12)]"
        >
          <div className="flex items-center gap-2 border-b border-[#EAE6DF] px-3 py-2.5">
            <Search className="size-4 shrink-0 text-stone-400" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent font-sans text-sm text-stone-900 outline-none placeholder:text-stone-400"
            />
          </div>

          <div className="max-h-56 overflow-y-auto py-1.5">
            {loading ? (
              <p className="px-4 py-6 text-center text-xs text-stone-500">
                Loading…
              </p>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-stone-500">
                {emptyText}
              </p>
            ) : (
              grouped.map(([group, items]) => (
                <div key={group || 'all'}>
                  {group ? (
                    <p className="px-4 pb-1 pt-2 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
                      {group}
                    </p>
                  ) : null}
                  {items.map((option) => {
                    const active = value.includes(option.value)
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => toggle(option.value)}
                        className={cn(
                          'flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-black/[0.03]',
                          active && 'bg-[#0C2686]/[0.04]',
                        )}
                      >
                        <span
                          className={cn(
                            'flex size-4 shrink-0 items-center justify-center rounded-[4px] border',
                            active
                              ? 'border-[#0C2686] bg-[#0C2686] text-white'
                              : 'border-stone-300 bg-white',
                          )}
                        >
                          {active ? (
                            <Check className="size-3 stroke-[2.5]" />
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-sans text-sm text-stone-800">
                            {option.label}
                          </span>
                          {option.hint ? (
                            <span className="block truncate font-sans text-[11px] text-stone-400">
                              {option.hint}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {footer ? (
            <div className="border-t border-[#EAE6DF] bg-white/70 px-3 py-2.5">
              {footer}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

const KIND_LABELS: Record<TagKind, string> = {
  LOCATION: 'Place',
  TOPIC: 'Topic',
  CATEGORY: 'Category',
}

const DEFAULT_PICKER_KINDS: TagKind[] = ['LOCATION', 'TOPIC']

type CmsTagPickerProps = {
  tags: CmsTag[]
  value: string[]
  onChange: (next: string[]) => void
  loading?: boolean
  /** Which tag kinds editors can pick/create. Defaults to Place + Topic (category comes from the story section). */
  kinds?: TagKind[]
  onCreateTag: (input: {
    kind: TagKind
    nameBg: string
  }) => Promise<CmsTag>
  className?: string
}

export function CmsTagPicker({
  tags,
  value,
  onChange,
  loading,
  kinds = DEFAULT_PICKER_KINDS,
  onCreateTag,
  className,
}: CmsTagPickerProps) {
  const allowedKinds = kinds
  const [creating, setCreating] = useState(false)
  const [kind, setKind] = useState<TagKind>(allowedKinds[0] ?? 'LOCATION')
  const [nameBg, setNameBg] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const kindOptions = useMemo(
    () =>
      allowedKinds.map((value) => ({
        value,
        label: KIND_LABELS[value],
      })),
    [allowedKinds],
  )

  const tagById = useMemo(() => {
    const map = new Map(tags.map((tag) => [tag.id, tag]))
    return map
  }, [tags])

  /** Category (and any other non-editable kinds) stay attached but hidden from this picker. */
  const preservedIds = useMemo(
    () =>
      value.filter((id) => {
        const tag = tagById.get(id)
        return tag ? !allowedKinds.includes(tag.kind) : false
      }),
    [value, tagById, allowedKinds],
  )

  const editableValue = useMemo(
    () => value.filter((id) => !preservedIds.includes(id)),
    [value, preservedIds],
  )

  const options = useMemo<CmsMultiSelectOption[]>(
    () =>
      tags
        .filter((tag) => allowedKinds.includes(tag.kind))
        .map((tag) => ({
          value: tag.id,
          label: tag.nameBg,
          hint: tag.nameEn || undefined,
          group: KIND_LABELS[tag.kind],
        })),
    [tags, allowedKinds],
  )

  const resetCreate = () => {
    setCreating(false)
    setNameBg('')
    setKind(allowedKinds[0] ?? 'LOCATION')
    setError(null)
  }

  const setEditableValue = (nextEditable: string[]) => {
    onChange([...preservedIds, ...nextEditable])
  }

  const handleCreate = async () => {
    if (!nameBg.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const tag = await onCreateTag({
        kind,
        nameBg: nameBg.trim(),
      })
      if (!editableValue.includes(tag.id)) {
        setEditableValue([...editableValue, tag.id])
      }
      resetCreate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <CmsMultiSelect
        options={options}
        value={editableValue}
        onChange={setEditableValue}
        loading={loading}
        placeholder="Search places and topics…"
        searchPlaceholder="Search places or topics…"
        emptyText="No tags match your search"
      />

      {!creating ? (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#0C2686]/30 bg-white px-3 py-2.5 font-sans text-xs font-semibold uppercase tracking-[0.14em] text-[#0C2686] transition-colors hover:border-[#0C2686]/50 hover:bg-[#0C2686]/[0.03]"
        >
          <Plus className="size-3.5" />
          Add new tag
        </button>
      ) : (
        <div className="space-y-3 rounded-xl border border-[#E8E4DC] bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
              New tag
            </p>
            <button
              type="button"
              onClick={resetCreate}
              className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              aria-label="Cancel"
            >
              <X className="size-4" />
            </button>
          </div>

          <CmsField label="Kind">
            <JournalSelect
              name="new-tag-kind"
              variant="boxed"
              label="Kind"
              placeholder="Select kind"
              options={kindOptions}
              value={kind}
              onChange={(value) => setKind(value as TagKind)}
            />
          </CmsField>

          <CmsField label="Name">
            <CmsInput
              value={nameBg}
              onChange={(e) => setNameBg(e.target.value)}
              placeholder={
                kind === 'LOCATION' ? 'e.g. Лом / Lom' : 'e.g. Килими / Kilims'
              }
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleCreate()
                }
              }}
            />
          </CmsField>

          {error ? (
            <p className="font-sans text-xs text-rose-600">{error}</p>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={resetCreate}
              className="rounded-xl px-3 py-2 font-sans text-xs font-medium text-stone-600 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!nameBg.trim() || saving}
              onClick={() => void handleCreate()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0C2686] px-3.5 py-2 font-sans text-xs font-semibold text-white transition hover:bg-[#4051C7] disabled:opacity-50"
            >
              <Plus className="size-3.5" />
              {saving ? 'Saving…' : 'Create & select'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
