import { Fragment, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft,
  ChevronRight,
  FolderTree,
  Pencil,
  Trash2,
} from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
  GhostButton,
  PrimaryButton,
} from '@/cms/components/CmsUI'
import {
  CmsField,
  CmsInput,
  CmsRadio,
  CmsRadioGroup,
  CmsTextarea,
} from '@/cms/components/CmsFields'
import { CmsModal } from '@/cms/components/CmsModal'
import { useCmsConfirm } from '@/cms/components/CmsConfirmDialog'
import { JournalSelect } from '@/components/ui/JournalSelect'
import { Alert } from '@/components/ui/Alert'
import { useJournalLang } from '@/hooks/useJournalLang'
import {
  createCmsCategory,
  deleteCmsCategory,
  listCmsCategories,
  updateCmsCategory,
  type CmsCategory,
} from '@/lib/categories-api'
import { pickLang } from '@/lib/pick-lang'
import { visibleCmsCategories } from '@/lib/category-tree'
import { cn } from '@/lib/utils'

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const

type CreateKind = 'parent' | 'child'

type EditState = {
  id: string
  nameBg: string
  descriptionBg: string
  parentId: string
  isChild: boolean
}

export default function CmsCategoriesPage() {
  const { t } = useTranslation()
  const { lang } = useJournalLang()
  const { confirm, dialog } = useCmsConfirm()
  const queryClient = useQueryClient()
  const [createKind, setCreateKind] = useState<CreateKind>('parent')
  const [nameBg, setNameBg] = useState('')
  const [parentId, setParentId] = useState('')
  const [descriptionBg, setDescriptionBg] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<EditState | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] =
    useState<(typeof PAGE_SIZE_OPTIONS)[number]>(20)
  const [toast, setToast] = useState<{
    open: boolean
    variant: 'success' | 'error'
    message: string
  }>({ open: false, variant: 'success', message: '' })

  const listQuery = useQuery({
    queryKey: ['cms-categories'],
    queryFn: listCmsCategories,
  })

  const categories = visibleCmsCategories(listQuery.data ?? [])
  const roots = useMemo(
    () => categories.filter((item) => !item.parentId),
    [categories],
  )
  const childrenByParent = useMemo(() => {
    const map = new Map<string, CmsCategory[]>()
    for (const item of categories) {
      if (!item.parentId) continue
      const list = map.get(item.parentId) ?? []
      list.push(item)
      map.set(item.parentId, list)
    }
    return map
  }, [categories])

  const total = roots.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    setPage(1)
  }, [pageSize])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const pagedRoots = roots.slice((page - 1) * pageSize, page * pageSize)

  const pageNumbers = useMemo(() => {
    const maxButtons = 5
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const half = Math.floor(maxButtons / 2)
    let start = Math.max(1, page - half)
    const end = Math.min(totalPages, start + maxButtons - 1)
    start = Math.max(1, end - maxButtons + 1)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [page, totalPages])

  const categoryName = (item: CmsCategory) =>
    pickLang(lang, item.nameEn, item.nameBg)

  const parentOptions = useMemo(
    () =>
      roots.map((item) => ({
        value: item.id,
        label: pickLang(lang, item.nameEn, item.nameBg),
      })),
    [roots, lang],
  )

  const resetCreate = () => {
    setNameBg('')
    setParentId('')
    setDescriptionBg('')
  }

  const createMutation = useMutation({
    mutationFn: () =>
      createCmsCategory({
        nameBg: nameBg.trim(),
        descriptionBg: descriptionBg.trim() || undefined,
        parentId: createKind === 'child' ? parentId || undefined : undefined,
      }),
    onSuccess: async () => {
      if (createKind === 'child' && parentId) {
        setExpanded((prev) => new Set(prev).add(parentId))
      }
      resetCreate()
      await queryClient.invalidateQueries({ queryKey: ['cms-categories'] })
      setToast({
        open: true,
        variant: 'success',
        message: t('cms.categories.created'),
      })
    },
    onError: (err: Error) => {
      setToast({
        open: true,
        variant: 'error',
        message: err.message || t('cms.categories.createFailed'),
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error('Nothing to update')
      return updateCmsCategory(editing.id, {
        nameBg: editing.nameBg.trim(),
        descriptionBg: editing.descriptionBg.trim(),
        ...(editing.isChild ? { parentId: editing.parentId || null } : {}),
      })
    },
    onSuccess: async () => {
      setEditing(null)
      await queryClient.invalidateQueries({ queryKey: ['cms-categories'] })
      setToast({
        open: true,
        variant: 'success',
        message: t('cms.categories.updated'),
      })
    },
    onError: (err: Error) => {
      setToast({
        open: true,
        variant: 'error',
        message: err.message || t('cms.categories.updateFailed'),
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCmsCategory(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cms-categories'] })
      setToast({
        open: true,
        variant: 'success',
        message: t('cms.categories.deleted'),
      })
    },
    onError: (err: Error) => {
      setToast({
        open: true,
        variant: 'error',
        message: err.message || t('cms.categories.deleteFailed'),
      })
    },
  })

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openEdit = (item: CmsCategory) => {
    setEditing({
      id: item.id,
      nameBg: item.nameBg,
      descriptionBg: item.descriptionBg ?? '',
      parentId: item.parentId ?? '',
      isChild: Boolean(item.parentId),
    })
  }

  const canCreate =
    Boolean(nameBg.trim()) &&
    (createKind === 'parent' || Boolean(parentId)) &&
    !createMutation.isPending

  const renderMeta = (item: CmsCategory) => {
    const parts: string[] = []
    if (item.childCount > 0) {
      parts.push(t('cms.categories.childrenCount', { count: item.childCount }))
    }
    if (item.articleCount > 0) {
      parts.push(t('cms.categories.count', { count: item.articleCount }))
    }
    return parts.join(' · ')
  }

  const renderActions = (item: CmsCategory) => {
    const name = categoryName(item)
    return (
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          className="rounded-lg border border-[#E8E4DC] p-2 text-stone-500 transition-colors hover:border-[#0C2686]/30 hover:text-[#0C2686]"
          onClick={() => openEdit(item)}
          aria-label={`${t('cms.categories.edit')}: ${name}`}
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          className="rounded-lg border border-[#E8E4DC] p-2 text-stone-500 transition-colors hover:border-rose-200 hover:text-rose-600"
          onClick={async () => {
            const ok = await confirm({
              title: t('cms.common.delete'),
              description: t('cms.categories.deleteConfirm', { name }),
            })
            if (ok) deleteMutation.mutate(item.id)
          }}
          aria-label={`${t('cms.common.delete')}: ${name}`}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    )
  }

  return (
    <div>
      <CmsPageHeader
        title={t('cms.categories.title')}
        description={t('cms.categories.description')}
        badge={t('cms.categories.badge', { count: categories.length })}
      />

      <Alert
        open={toast.open}
        variant={toast.variant}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      <CmsCard className="mb-6 space-y-5 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-800">
          <FolderTree className="size-4 text-[#0C2686]" />
          {t('cms.categories.createTitle')}
        </h2>

        <CmsRadioGroup className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <CmsRadio
            name="category-create-kind"
            checked={createKind === 'parent'}
            onChange={() => {
              setCreateKind('parent')
              setParentId('')
            }}
            label={t('cms.categories.createParent')}
            description={t('cms.categories.createParentHint')}
          />
          <CmsRadio
            name="category-create-kind"
            checked={createKind === 'child'}
            onChange={() => setCreateKind('child')}
            label={t('cms.categories.createChild')}
            description={t('cms.categories.createChildHint')}
          />
        </CmsRadioGroup>

        <CmsField label={t('cms.categories.name')}>
          <CmsInput
            value={nameBg}
            onChange={(e) => setNameBg(e.target.value)}
            placeholder={t('cms.categories.namePlaceholder')}
          />
          <p className="text-xs text-stone-500">{t('cms.categories.nameHint')}</p>
        </CmsField>

        {createKind === 'child' && (
          <CmsField label={t('cms.categories.parent')}>
            <JournalSelect
              name="category-parent"
              variant="boxed"
              value={parentId}
              onChange={setParentId}
              placeholder={t('cms.categories.noParent')}
              options={parentOptions}
            />
            <p className="text-xs text-stone-500">
              {t('cms.categories.parentHint')}
            </p>
          </CmsField>
        )}

        <CmsField label={t('cms.categories.descriptionLabel')}>
          <CmsTextarea
            value={descriptionBg}
            onChange={(e) => setDescriptionBg(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-stone-500">
            {t('cms.categories.descriptionHint')}
          </p>
        </CmsField>

        <PrimaryButton
          type="button"
          disabled={!canCreate}
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending
            ? t('cms.common.saving')
            : createKind === 'child'
              ? t('cms.categories.addChild')
              : t('cms.categories.addParent')}
        </PrimaryButton>
      </CmsCard>

      {listQuery.isLoading ? (
        <CmsCard className="p-6 text-sm text-stone-500">
          {t('cms.categories.loading')}
        </CmsCard>
      ) : roots.length === 0 ? (
        <CmsCard className="p-6 text-sm text-stone-500">
          {t('cms.categories.empty')}
        </CmsCard>
      ) : (
        <>
          <CmsCard hover={false} className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-[#E8E4DC] bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="px-4 py-3">{t('cms.categories.colName')}</th>
                    <th className="px-4 py-3">
                      {t('cms.categories.colStories')}
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {pagedRoots.map((root) => {
                    const name = categoryName(root)
                    const open = expanded.has(root.id)
                    const children = childrenByParent.get(root.id) ?? []
                    return (
                      <Fragment key={root.id}>
                        <tr
                          className="border-b border-[#E8E4DC]/70 transition-colors hover:bg-stone-50/80"
                        >
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 text-left"
                              onClick={() => toggleExpanded(root.id)}
                              aria-expanded={open}
                              aria-label={t(
                                open
                                  ? 'cms.categories.collapse'
                                  : 'cms.categories.expand',
                                { name },
                              )}
                            >
                              <ChevronRight
                                className={cn(
                                  'size-4 shrink-0 text-stone-400 transition-transform',
                                  open && 'rotate-90 text-[#0C2686]',
                                )}
                              />
                              <span className="font-medium text-stone-900">
                                {name}
                              </span>
                            </button>
                          </td>
                          <td className="px-4 py-3 text-xs text-stone-500">
                            {renderMeta(root) || '—'}
                          </td>
                          <td className="px-4 py-3">{renderActions(root)}</td>
                        </tr>
                        {open &&
                          (children.length === 0 ? (
                            <tr
                              key={`${root.id}-empty`}
                              className="border-b border-[#E8E4DC]/70 bg-stone-50/60"
                            >
                              <td
                                colSpan={3}
                                className="px-4 py-3 pl-12 text-xs text-stone-500"
                              >
                                {t('cms.categories.emptyChildren')}
                              </td>
                            </tr>
                          ) : (
                            children.map((child) => (
                              <tr
                                key={child.id}
                                className="border-b border-[#E8E4DC]/70 bg-stone-50/60"
                              >
                                <td className="px-4 py-3 pl-12">
                                  <span className="text-sm text-stone-800">
                                    {categoryName(child)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-xs text-stone-500">
                                  {child.articleCount > 0
                                    ? t('cms.categories.count', {
                                        count: child.articleCount,
                                      })
                                    : '—'}
                                </td>
                                <td className="px-4 py-3">
                                  {renderActions(child)}
                                </td>
                              </tr>
                            ))
                          ))}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CmsCard>

          {total > 0 && (
            <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-[#E8E4DC] bg-white px-4 py-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium text-stone-600">
                {t('cms.common.showing', { from, to, total })}
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex min-w-[140px] items-center gap-3">
                  <span className="shrink-0 text-xs font-medium text-stone-600">
                    {t('cms.common.perPage')}
                  </span>
                  <JournalSelect
                    name="categoriesPageSize"
                    variant="boxed"
                    value={String(pageSize)}
                    onChange={(value) =>
                      setPageSize(
                        Number(value) as (typeof PAGE_SIZE_OPTIONS)[number],
                      )
                    }
                    options={PAGE_SIZE_OPTIONS.map((size) => ({
                      value: String(size),
                      label: String(size),
                    }))}
                    className="min-w-[88px] flex-1"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || listQuery.isFetching}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#E8E4DC] bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="size-3.5" />
                    {t('cms.common.prev')}
                  </button>

                  {pageNumbers.map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPage(num)}
                      disabled={listQuery.isFetching}
                      className={cn(
                        'min-w-8 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-colors',
                        num === page
                          ? 'bg-[#0C2686] text-white shadow-xs'
                          : 'border border-[#E8E4DC] bg-stone-50 text-stone-700 hover:bg-white',
                      )}
                    >
                      {num}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || listQuery.isFetching}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#E8E4DC] bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t('cms.common.next')}
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>

                <p className="text-xs font-medium text-stone-500">
                  {t('cms.common.pageOf', { page, totalPages })}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      <CmsModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={t('cms.categories.editTitle')}
      >
        {editing && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (!editing.nameBg.trim()) return
              if (editing.isChild && !editing.parentId) return
              updateMutation.mutate()
            }}
          >
            <CmsField label={t('cms.categories.name')} htmlFor="edit-category-name">
              <CmsInput
                id="edit-category-name"
                value={editing.nameBg}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, nameBg: e.target.value } : prev,
                  )
                }
                required
              />
            </CmsField>

            {editing.isChild && (
              <CmsField label={t('cms.categories.parent')}>
                <JournalSelect
                  name="edit-category-parent"
                  variant="boxed"
                  value={editing.parentId}
                  onChange={(value) =>
                    setEditing((prev) =>
                      prev ? { ...prev, parentId: value } : prev,
                    )
                  }
                  placeholder={t('cms.categories.noParent')}
                  options={parentOptions.filter(
                    (option) => option.value !== editing.id,
                  )}
                />
              </CmsField>
            )}

            <CmsField
              label={t('cms.categories.descriptionLabel')}
              htmlFor="edit-category-description"
            >
              <CmsTextarea
                id="edit-category-description"
                value={editing.descriptionBg}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, descriptionBg: e.target.value } : prev,
                  )
                }
                rows={3}
              />
            </CmsField>

            <div className="flex justify-end gap-2 pt-2">
              <GhostButton type="button" onClick={() => setEditing(null)}>
                {t('cms.categories.cancel')}
              </GhostButton>
              <PrimaryButton
                type="submit"
                disabled={
                  !editing.nameBg.trim() ||
                  (editing.isChild && !editing.parentId) ||
                  updateMutation.isPending
                }
              >
                {updateMutation.isPending
                  ? t('cms.common.saving')
                  : t('cms.common.save')}
              </PrimaryButton>
            </div>
          </form>
        )}
      </CmsModal>
      {dialog}
    </div>
  )
}
