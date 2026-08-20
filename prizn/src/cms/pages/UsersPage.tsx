import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Pencil, Plus, Search } from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
  GhostButton,
  PrimaryButton,
  StatusPill,
} from '@/cms/components/CmsUI'
import { CmsField, CmsInput, CmsCheckbox } from '@/cms/components/CmsFields'
import { CmsModal } from '@/cms/components/CmsModal'
import { CmsPasswordInput } from '@/cms/components/CmsPasswordInput'
import { Alert } from '@/components/ui/Alert'
import { JournalSelect } from '@/components/ui/JournalSelect'
import { useAuth } from '@/lib/auth'
import {
  createCmsUser,
  listCmsUsers,
  updateCmsUser,
  type CmsUser,
  type CmsUserRole,
} from '@/lib/users-api'
import { CMS_USER_ROLES, cmsRoleI18nKey, hasCmsRole } from '@/lib/cms-roles'
import { cn } from '@/lib/utils'

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const
const ROLE_FILTERS: Array<'all' | CmsUserRole> = ['all', ...CMS_USER_ROLES]

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  roles: ['EDITOR'] as CmsUserRole[],
  showOnAuthors: false,
}

function itemRoles(item: Pick<CmsUser, 'role' | 'roles'>): CmsUserRole[] {
  return item.roles?.length ? item.roles : [item.role]
}

function toggleRole(roles: CmsUserRole[], role: CmsUserRole): CmsUserRole[] {
  return roles.includes(role)
    ? roles.filter((item) => item !== role)
    : [...roles, role]
}

export default function CmsUsersPage() {
  const { t } = useTranslation()
  const { user: me } = useAuth()
  const queryClient = useQueryClient()
  const isAdmin = hasCmsRole(me, 'ADMIN')

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_FILTERS)[number]>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<{
    id: string
    name: string
    email: string
    roles: CmsUserRole[]
    showOnAuthors: boolean
  } | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [toast, setToast] = useState<{
    open: boolean
    variant: 'success' | 'error'
    message: string
  }>({ open: false, variant: 'success', message: '' })

  const roleOptions = useMemo(
    () =>
      CMS_USER_ROLES.map((role) => ({
        value: role,
        label: t(cmsRoleI18nKey(role)),
      })),
    [t],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    setPage(1)
  }, [debouncedQuery, pageSize, roleFilter])

  const listQuery = useQuery({
    queryKey: ['cms-users', page, pageSize, roleFilter, debouncedQuery],
    queryFn: () =>
      listCmsUsers({
        page,
        pageSize,
        q: debouncedQuery || undefined,
        role: roleFilter === 'all' ? undefined : roleFilter,
      }),
    placeholderData: (prev) => prev,
  })

  const items = listQuery.data?.items ?? []
  const total = listQuery.data?.total ?? 0
  const totalPages = listQuery.data?.totalPages ?? 1

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

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

  const closeCreate = () => {
    setCreateOpen(false)
    setForm(EMPTY_FORM)
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      roles,
      isActive,
      name,
      email,
      showOnAuthors,
    }: {
      id: string
      roles?: CmsUserRole[]
      isActive?: boolean
      name?: string
      email?: string
      showOnAuthors?: boolean
    }) => updateCmsUser(id, { roles, isActive, name, email, showOnAuthors }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cms-users'] })
      await queryClient.invalidateQueries({ queryKey: ['cms-authors-desk'] })
      await queryClient.invalidateQueries({ queryKey: ['cms-authors'] })
      await queryClient.invalidateQueries({ queryKey: ['cms-authors-count'] })
      setEditing(null)
      setToast({ open: true, variant: 'success', message: t('cms.users.updated') })
    },
    onError: (err: Error) => {
      setToast({
        open: true,
        variant: 'error',
        message: err.message || t('cms.users.updateFailed'),
      })
    },
  })

  const createMutation = useMutation({
    mutationFn: () =>
      createCmsUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        roles: form.roles,
        showOnAuthors: form.showOnAuthors,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cms-users'] })
      await queryClient.invalidateQueries({ queryKey: ['cms-authors-desk'] })
      await queryClient.invalidateQueries({ queryKey: ['cms-authors'] })
      await queryClient.invalidateQueries({ queryKey: ['cms-authors-count'] })
      closeCreate()
      setToast({ open: true, variant: 'success', message: t('cms.users.created') })
    },
    onError: (err: Error) => {
      setToast({
        open: true,
        variant: 'error',
        message: err.message || t('cms.users.createFailed'),
      })
    },
  })

  const passwordsMatch =
    form.password.length > 0 && form.password === form.confirmPassword
  const canSubmitCreate =
    form.name.trim().length > 0 &&
    form.email.trim().includes('@') &&
    form.password.length >= 8 &&
    passwordsMatch &&
    form.roles.length > 0 &&
    !createMutation.isPending

  return (
    <div>
      <CmsPageHeader
        title={t('cms.users.title')}
        description={t('cms.users.description')}
        badge={t('cms.users.badge', { count: total })}
        actions={
          isAdmin ? (
            <PrimaryButton onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              {t('cms.users.newUser')}
            </PrimaryButton>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('cms.users.searchPlaceholder')}
            className="w-full rounded-xl border border-[#E8E4DC] bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#0C2686]"
          />
        </div>

        <div className="w-full sm:max-w-[240px]">
          <JournalSelect
            name="usersRoleFilter"
            variant="boxed"
            label={t('cms.users.colRole')}
            value={roleFilter}
            onChange={(value) =>
              setRoleFilter(value as (typeof ROLE_FILTERS)[number])
            }
            options={[
              { value: 'all', label: t('cms.users.allRoles') },
              ...roleOptions,
            ]}
          />
        </div>
      </div>

      {listQuery.isLoading && (
        <CmsCard className="p-8 text-sm text-stone-600">
          {t('cms.users.loading')}
        </CmsCard>
      )}

      {listQuery.isError && (
        <CmsCard className="p-8 text-sm text-rose-700">
          {t('cms.users.loadFailed')} {(listQuery.error as Error).message}
        </CmsCard>
      )}

      {!listQuery.isLoading && !listQuery.isError && total === 0 && (
        <CmsCard className="p-8 text-sm text-stone-600">
          {t('cms.users.empty')}
        </CmsCard>
      )}

      {items.length > 0 && (
        <CmsCard hover={false} className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-[#E8E4DC] bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">{t('cms.users.colUser')}</th>
                  <th className="px-4 py-3">{t('cms.users.colRole')}</th>
                  <th className="px-4 py-3">{t('cms.users.colStatus')}</th>
                  <th className="px-4 py-3">{t('cms.users.colVerified')}</th>
                  <th className="px-4 py-3">{t('cms.users.colJoined')}</th>
                  {isAdmin && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[#E8E4DC]/70 transition-colors hover:bg-stone-50/80"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-900">
                        {item.name || '—'}
                        {me?.id === item.id && (
                          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-[#0C2686]">
                            {t('cms.common.you')}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-stone-500">{item.email}</p>
                      {item.authorId && (
                        <Link
                          to={`/cms/authors/${item.authorId}`}
                          className="mt-1 inline-flex text-[11px] font-semibold text-[#0C2686] hover:underline"
                        >
                          {t('cms.users.openAuthor')}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {itemRoles(item).map((role) => (
                          <span
                            key={role}
                            className="rounded-full border border-[#E8E4DC] bg-stone-50 px-2 py-0.5 text-[11px] font-semibold text-stone-700"
                          >
                            {t(cmsRoleI18nKey(role))}
                          </span>
                        ))}
                      </div>
                      {item.showOnAuthors ? (
                        <p className="mt-1 text-[11px] font-medium text-[#0C2686]">
                          {t('cms.users.listedOnAuthors')}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {isAdmin ? (
                        <button
                          type="button"
                          disabled={updateMutation.isPending || me?.id === item.id}
                          onClick={() =>
                            updateMutation.mutate({
                              id: item.id,
                              isActive: !item.isActive,
                            })
                          }
                          className={cn(
                            'rounded-full border px-2.5 py-1 text-xs font-semibold transition',
                            item.isActive
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                              : 'border-stone-200 bg-stone-100 text-stone-600 hover:bg-stone-200',
                            (updateMutation.isPending || me?.id === item.id) &&
                              'cursor-not-allowed opacity-60',
                          )}
                        >
                          {item.isActive
                            ? t('cms.common.active')
                            : t('cms.common.inactive')}
                        </button>
                      ) : (
                        <StatusPill status={item.isActive ? 'active' : 'archived'} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-xs font-semibold',
                          item.emailVerified
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-amber-200 bg-amber-50 text-amber-800',
                        )}
                      >
                        {item.emailVerified
                          ? t('cms.users.verified')
                          : t('cms.users.unverified')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-500">{item.joinedAt}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setEditing({
                              id: item.id,
                              name: item.name ?? '',
                              email: item.email,
                              roles: itemRoles(item),
                              showOnAuthors: item.showOnAuthors,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-xl border border-[#E8E4DC] bg-stone-50 px-2.5 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-white"
                        >
                          <Pencil className="size-3.5" />
                          {t('cms.users.edit')}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CmsCard>
      )}

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
                name="usersPageSize"
                variant="boxed"
                value={String(pageSize)}
                onChange={(value) =>
                  setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number])
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

      {!isAdmin && (
        <p className="mt-4 text-xs text-stone-500">
          {t('cms.users.adminOnly')}
        </p>
      )}

      <CmsModal
        open={createOpen}
        onClose={closeCreate}
        title={t('cms.users.createTitle')}
        description={t('cms.users.createDescription')}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!canSubmitCreate) return
            createMutation.mutate()
          }}
        >
          <CmsField label={t('cms.users.name')} htmlFor="cms-user-name">
            <CmsInput
              id="cms-user-name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              autoComplete="name"
              required
            />
          </CmsField>
          <CmsField label={t('cms.users.email')} htmlFor="cms-user-email">
            <CmsInput
              id="cms-user-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              autoComplete="off"
              required
            />
          </CmsField>
          <CmsField label={t('cms.users.password')} htmlFor="cms-user-password">
            <CmsPasswordInput
              id="cms-user-password"
              value={form.password}
              onChange={(password) => setForm((prev) => ({ ...prev, password }))}
              visible={showPassword}
              onToggleVisible={() => setShowPassword((prev) => !prev)}
              showLabel={t('cms.users.showPassword')}
              hideLabel={t('cms.users.hidePassword')}
              required
              minLength={8}
            />
            <p className="text-xs text-stone-500">{t('cms.users.passwordHint')}</p>
          </CmsField>
          <CmsField
            label={t('cms.users.confirmPassword')}
            htmlFor="cms-user-confirm-password"
          >
            <CmsPasswordInput
              id="cms-user-confirm-password"
              value={form.confirmPassword}
              onChange={(confirmPassword) =>
                setForm((prev) => ({ ...prev, confirmPassword }))
              }
              visible={showConfirmPassword}
              onToggleVisible={() => setShowConfirmPassword((prev) => !prev)}
              showLabel={t('cms.users.showPassword')}
              hideLabel={t('cms.users.hidePassword')}
              required
              minLength={8}
            />
            {form.confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-rose-700">{t('cms.users.passwordMismatch')}</p>
            )}
          </CmsField>
          <CmsField label={t('cms.users.colRole')}>
            <div className="grid gap-2 sm:grid-cols-2">
              {CMS_USER_ROLES.map((role) => (
                <CmsCheckbox
                  key={role}
                  name={`create-role-${role}`}
                  label={t(cmsRoleI18nKey(role))}
                  checked={form.roles.includes(role)}
                  onChange={() =>
                    setForm((prev) => {
                      const roles = toggleRole(prev.roles, role)
                      const addedAuthor =
                        role === 'AUTHOR' &&
                        roles.includes('AUTHOR') &&
                        !prev.roles.includes('AUTHOR')
                      return {
                        ...prev,
                        roles,
                        showOnAuthors: addedAuthor ? true : prev.showOnAuthors,
                      }
                    })
                  }
                />
              ))}
            </div>
            <p className="text-xs text-stone-500">{t('cms.users.rolesHint')}</p>
          </CmsField>
          <CmsCheckbox
            name="create-show-on-authors"
            label={t('cms.users.showOnAuthors')}
            description={t('cms.users.showOnAuthorsHint')}
            checked={form.showOnAuthors}
            onChange={() =>
              setForm((prev) => ({
                ...prev,
                showOnAuthors: !prev.showOnAuthors,
              }))
            }
          />
          <div className="flex justify-end gap-2 pt-2">
            <GhostButton type="button" onClick={closeCreate}>
              {t('cms.users.cancel')}
            </GhostButton>
            <PrimaryButton type="submit" disabled={!canSubmitCreate}>
              {createMutation.isPending
                ? t('cms.common.saving')
                : t('cms.common.create')}
            </PrimaryButton>
          </div>
        </form>
      </CmsModal>

      <CmsModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={t('cms.users.editTitle')}
        description={t('cms.users.editDescription')}
      >
        {editing && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (!editing.name.trim() || !editing.email.includes('@') || !editing.roles.length)
                return
              updateMutation.mutate({
                id: editing.id,
                name: editing.name.trim(),
                email: editing.email.trim(),
                roles: editing.roles,
                showOnAuthors: editing.showOnAuthors,
              })
            }}
          >
            <CmsField label={t('cms.users.name')} htmlFor="cms-user-edit-name">
              <CmsInput
                id="cms-user-edit-name"
                value={editing.name}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, name: e.target.value } : prev,
                  )
                }
                autoComplete="name"
                required
              />
            </CmsField>
            <CmsField label={t('cms.users.email')} htmlFor="cms-user-edit-email">
              <CmsInput
                id="cms-user-edit-email"
                type="email"
                value={editing.email}
                onChange={(e) =>
                  setEditing((prev) =>
                    prev ? { ...prev, email: e.target.value } : prev,
                  )
                }
                autoComplete="off"
                required
              />
            </CmsField>
            <CmsField label={t('cms.users.colRole')}>
              <div className="grid gap-2 sm:grid-cols-2">
                {CMS_USER_ROLES.map((role) => (
                  <CmsCheckbox
                    key={role}
                    name={`edit-role-${role}`}
                    label={t(cmsRoleI18nKey(role))}
                    checked={editing.roles.includes(role)}
                    onChange={() =>
                      setEditing((prev) =>
                        prev
                          ? { ...prev, roles: toggleRole(prev.roles, role) }
                          : prev,
                      )
                    }
                  />
                ))}
              </div>
            </CmsField>
            <CmsCheckbox
              name="edit-show-on-authors"
              label={t('cms.users.showOnAuthors')}
              description={t('cms.users.showOnAuthorsHint')}
              checked={editing.showOnAuthors}
              onChange={() =>
                setEditing((prev) =>
                  prev
                    ? { ...prev, showOnAuthors: !prev.showOnAuthors }
                    : prev,
                )
              }
            />
            <div className="flex justify-end gap-2 pt-2">
              <GhostButton type="button" onClick={() => setEditing(null)}>
                {t('cms.users.cancel')}
              </GhostButton>
              <PrimaryButton
                type="submit"
                disabled={
                  updateMutation.isPending ||
                  !editing.name.trim() ||
                  !editing.email.includes('@') ||
                  editing.roles.length === 0
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

      <Alert
        open={toast.open}
        variant={toast.variant}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </div>
  )
}
