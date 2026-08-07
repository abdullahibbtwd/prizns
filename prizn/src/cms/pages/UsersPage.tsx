import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Search, Shield, Users } from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
  StatusPill,
} from '@/cms/components/CmsUI'
import { Alert } from '@/components/ui/Alert'
import { JournalSelect } from '@/components/ui/JournalSelect'
import { useAuth } from '@/lib/auth'
import {
  listCmsUsers,
  updateCmsUser,
  type CmsUserRole,
} from '@/lib/users-api'
import { cn } from '@/lib/utils'

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const
const ROLE_FILTERS: Array<'all' | CmsUserRole> = ['all', 'ADMIN', 'EDITOR']

export default function CmsUsersPage() {
  const { user: me } = useAuth()
  const queryClient = useQueryClient()
  const isAdmin = me?.role === 'ADMIN'

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_FILTERS)[number]>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10)
  const [toast, setToast] = useState<{
    open: boolean
    variant: 'success' | 'error'
    message: string
  }>({ open: false, variant: 'success', message: '' })

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

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      role,
      isActive,
    }: {
      id: string
      role?: CmsUserRole
      isActive?: boolean
    }) => updateCmsUser(id, { role, isActive }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cms-users'] })
      setToast({ open: true, variant: 'success', message: 'User updated.' })
    },
    onError: (err: Error) => {
      setToast({
        open: true,
        variant: 'error',
        message: err.message || 'Failed to update user.',
      })
    },
  })

  return (
    <div>
      <CmsPageHeader
        title="User Management"
        description="CMS staff accounts and their roles (Admin / Editor)."
        badge={`${total} Users`}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CmsCard hover={false} className="flex items-center gap-4 p-5">
          <div className="flex size-11 items-center justify-center rounded-xl bg-[#0C2686]/10 text-[#0C2686]">
            <Users className="size-5" />
          </div>
          <div>
            <p className="font-heading text-xs font-bold uppercase tracking-wider text-stone-500">
              Team members
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-stone-900">{total}</p>
          </div>
        </CmsCard>
        <CmsCard hover={false} className="flex items-center gap-4 p-5">
          <div className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
            <Shield className="size-5" />
          </div>
          <div>
            <p className="font-heading text-xs font-bold uppercase tracking-wider text-stone-500">
              Roles
            </p>
            <p className="mt-1 text-sm font-semibold text-stone-800">
              ADMIN · EDITOR
            </p>
          </div>
        </CmsCard>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email…"
            className="w-full rounded-xl border border-[#E8E4DC] bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#0C2686]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {ROLE_FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRoleFilter(item)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                roleFilter === item
                  ? 'border-[#0C2686] bg-[#0C2686] text-white'
                  : 'border-[#E8E4DC] bg-white text-stone-600 hover:border-[#0C2686]/40',
              )}
            >
              {item === 'all' ? 'All roles' : item}
            </button>
          ))}
        </div>
      </div>

      {listQuery.isLoading && (
        <CmsCard className="p-8 text-sm text-stone-600">Loading users…</CmsCard>
      )}

      {listQuery.isError && (
        <CmsCard className="p-8 text-sm text-rose-700">
          Failed to load users. {(listQuery.error as Error).message}
        </CmsCard>
      )}

      {!listQuery.isLoading && !listQuery.isError && total === 0 && (
        <CmsCard className="p-8 text-sm text-stone-600">
          No users found.
        </CmsCard>
      )}

      {items.length > 0 && (
        <CmsCard hover={false} className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-[#E8E4DC] bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined</th>
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
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-stone-500">{item.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {isAdmin ? (
                        <div className="min-w-[140px] max-w-[180px]">
                          <JournalSelect
                            name={`role-${item.id}`}
                            value={item.role}
                            onChange={(value) => {
                              if (value === item.role) return
                              updateMutation.mutate({
                                id: item.id,
                                role: value as CmsUserRole,
                              })
                            }}
                            options={[
                              { value: 'ADMIN', label: 'ADMIN' },
                              { value: 'EDITOR', label: 'EDITOR' },
                            ]}
                          />
                        </div>
                      ) : (
                        <StatusPill status={item.role.toLowerCase()} />
                      )}
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
                          {item.isActive ? 'Active' : 'Inactive'}
                        </button>
                      ) : (
                        <StatusPill status={item.isActive ? 'active' : 'archived'} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-500">{item.joinedAt}</td>
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
            Showing {from}–{to} of {total}
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex min-w-[140px] items-center gap-3">
              <span className="shrink-0 text-xs font-medium text-stone-600">Per page</span>
              <JournalSelect
                name="usersPageSize"
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
                Prev
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
                Next
                <ChevronRight className="size-3.5" />
              </button>
            </div>

            <p className="text-xs font-medium text-stone-500">
              Page {page} of {totalPages}
            </p>
          </div>
        </div>
      )}

      {!isAdmin && (
        <p className="mt-4 text-xs text-stone-500">
          Role and status changes require an Admin account.
        </p>
      )}

      <Alert
        open={toast.open}
        variant={toast.variant}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </div>
  )
}
