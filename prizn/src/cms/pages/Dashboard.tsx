import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowUpRight,
  FileText,
  Clock3,
  CalendarDays,
  Eye,
  Sparkles,
  CheckSquare,
  Flame,
  CheckCircle2,
  ListTodo,
  TrendingUp,
  Bot,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
  PrimaryButton,
  StatCard,
} from '@/cms/components/CmsUI'
import { Alert } from '@/components/ui/Alert'
import { useAuth } from '@/lib/auth'
import { getAnalyticsSummary } from '@/lib/analytics-api'
import {
  createCmsTodo,
  deleteCmsTodo,
  getDashboardChecklist,
  listCmsTodos,
  updateCmsTodo,
} from '@/lib/dashboard-api'
import { canAccessCmsPath } from '@/lib/cms-roles'
import { formatTrendPct } from '@/lib/format'
import { cn } from '@/lib/utils'

export default function CmsDashboard() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month'>('today')
  const [todoDraft, setTodoDraft] = useState('')
  const [todoDue, setTodoDue] = useState('')
  const [toast, setToast] = useState<{
    open: boolean
    variant: 'success' | 'error'
    message: string
  }>({ open: false, variant: 'success', message: '' })

  const firstName =
    user?.name?.trim().split(/\s+/)[0] ||
    user?.email?.split('@')[0] ||
    t('cms.editorRole')

  const canStories = canAccessCmsPath(user, '/cms/stories')
  const canAnalytics = canAccessCmsPath(user, '/cms/analytics')
  const canAi = canAccessCmsPath(user, '/cms/ai')
  const canSubmissions = canAccessCmsPath(user, '/cms/submissions')

  const checklistQuery = useQuery({
    queryKey: ['cms-dashboard-checklist'],
    queryFn: getDashboardChecklist,
  })

  const analyticsQuery = useQuery({
    queryKey: ['cms-analytics-summary', timeframe],
    queryFn: () => getAnalyticsSummary(timeframe),
    enabled: canAnalytics,
  })

  const todosQuery = useQuery({
    queryKey: ['cms-todos'],
    queryFn: listCmsTodos,
  })

  const createTodoMutation = useMutation({
    mutationFn: () =>
      createCmsTodo({
        title: todoDraft.trim(),
        dueAt: todoDue ? new Date(todoDue).toISOString() : null,
      }),
    onSuccess: async () => {
      setTodoDraft('')
      setTodoDue('')
      await queryClient.invalidateQueries({ queryKey: ['cms-todos'] })
    },
    onError: (err: Error) => {
      setToast({
        open: true,
        variant: 'error',
        message: err.message || t('cms.dashboard.todoFailed'),
      })
    },
  })

  const updateTodoMutation = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      updateCmsTodo(id, { done }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cms-todos'] })
    },
  })

  const deleteTodoMutation = useMutation({
    mutationFn: (id: string) => deleteCmsTodo(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cms-todos'] })
    },
  })

  const checklist = checklistQuery.data
  const drafts = checklist?.draftArticles ?? 0
  const pending =
    (checklist?.reviewArticles ?? 0) + (checklist?.pendingSubmissions ?? 0)
  const publishedToday = checklist?.publishedToday ?? 0
  const scheduled = checklist?.scheduledArticles ?? 0
  const analytics = analyticsQuery.data
  const trafficValue = (analytics?.visitors ?? 0).toLocaleString()
  const trafficTrend = formatTrendPct(analytics?.visitorsTrendPct ?? 0)
  const trafficTrendType =
    (analytics?.visitorsTrendPct ?? 0) > 0
      ? 'up'
      : (analytics?.visitorsTrendPct ?? 0) < 0
        ? 'down'
        : 'neutral'
  const sparklineData =
    analytics?.daily && analytics.daily.length > 0
      ? analytics.daily.map((d) => d.views)
      : undefined
  const topStories = analytics?.topStories ?? []

  const autoTasks = useMemo(() => {
    const data = checklistQuery.data
    if (!data) return []
    return [
      canSubmissions
        ? {
            id: 'submissions',
            label: t('cms.dashboard.taskSubmissions', {
              count: data.pendingSubmissions,
            }),
            done: data.pendingSubmissions === 0,
            to: '/cms/submissions',
          }
        : null,
      canStories
        ? {
            id: 'review',
            label: t('cms.dashboard.taskReview', { count: data.reviewArticles }),
            done: data.reviewArticles === 0,
            to: '/cms/stories?status=REVIEW',
          }
        : null,
      canStories
        ? {
            id: 'translations',
            label: t('cms.dashboard.taskTranslations', {
              count: data.failedTranslations,
            }),
            done: data.failedTranslations === 0,
            to: '/cms/stories',
          }
        : null,
      canStories
        ? {
            id: 'publish',
            label: t('cms.dashboard.taskPublish', { count: data.publishedToday }),
            done: data.publishedToday > 0,
            to: '/cms/stories?status=PUBLISHED',
          }
        : null,
    ].filter((task): task is NonNullable<typeof task> => Boolean(task))
  }, [canStories, canSubmissions, checklistQuery.data, t])

  const aiSuggestions = useMemo(() => {
    const data = checklistQuery.data
    if (!data) return []
    const items: Array<{ id: string; label: string; to: string }> = []
    if (data.failedTranslations > 0 && canStories) {
      items.push({
        id: 'ai-translations',
        label: t('cms.dashboard.aiFixTranslations', {
          count: data.failedTranslations,
        }),
        to: '/cms/stories',
      })
    }
    if (data.reviewArticles > 0 && canStories) {
      items.push({
        id: 'ai-review',
        label: t('cms.dashboard.aiReviewStories', {
          count: data.reviewArticles,
        }),
        to: '/cms/stories?status=REVIEW',
      })
    }
    if (data.pendingSubmissions > 0 && canSubmissions) {
      items.push({
        id: 'ai-submissions',
        label: t('cms.dashboard.aiReviewSubmissions', {
          count: data.pendingSubmissions,
        }),
        to: '/cms/submissions',
      })
    }
    if (data.draftArticles > 0 && canStories) {
      items.push({
        id: 'ai-drafts',
        label: t('cms.dashboard.aiFinishDrafts', { count: data.draftArticles }),
        to: '/cms/stories?status=DRAFT',
      })
    }
    if (items.length === 0 && canAi) {
      items.push({
        id: 'ai-clear',
        label: t('cms.dashboard.aiAllClear'),
        to: '/cms/ai',
      })
    }
    return items.slice(0, 4)
  }, [canAi, canStories, canSubmissions, checklistQuery.data, t])

  const personalTodos = todosQuery.data ?? []
  const autoDone = autoTasks.filter((task) => task.done).length
  const personalDone = personalTodos.filter((todo) => todo.done).length
  const totalTasks = autoTasks.length + personalTodos.length
  const totalDone = autoDone + personalDone

  const hour = new Date().getHours()
  const greeting =
    hour < 12
      ? t('cms.dashboard.greetingMorning')
      : hour < 18
        ? t('cms.dashboard.greetingAfternoon')
        : t('cms.dashboard.greetingEvening')
  const today = new Date().toLocaleDateString(
    i18n.language === 'bg' ? 'bg-BG' : 'en-GB',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    },
  )

  const submitTodo = (e: React.FormEvent) => {
    e.preventDefault()
    if (!todoDraft.trim() || createTodoMutation.isPending) return
    createTodoMutation.mutate()
  }

  const queryError =
    checklistQuery.error || analyticsQuery.error || todosQuery.error

  return (
    <div>
      <CmsPageHeader
        title={`${greeting}, ${firstName}`}
        description={t('cms.dashboard.desk', { date: today })}
        badge={t('cms.dashboard.activeSession')}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {canAnalytics ? (
              <div className="flex items-center rounded-xl border border-[#E8E4DC] bg-white p-1 shadow-2xs">
                {(['today', 'week', 'month'] as const).map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setTimeframe(tf)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer',
                      timeframe === tf
                        ? 'bg-[#0C2686] text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100',
                    )}
                  >
                    {t(`cms.dashboard.${tf}`)}
                  </button>
                ))}
              </div>
            ) : null}

            {canStories ? (
              <Link to="/cms/stories/new">
                <PrimaryButton>
                  <Plus className="size-4" />
                  {t('cms.dashboard.newStory')}
                </PrimaryButton>
              </Link>
            ) : null}
          </div>
        }
      />

      <Alert
        open={toast.open}
        variant={toast.variant}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      {queryError ? (
        <p className="mb-6 text-sm text-rose-700">
          {t('cms.dashboard.loadFailed')}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {canAnalytics ? (
          <StatCard
            title={t('cms.dashboard.traffic')}
            value={trafficValue}
            trend={trafficTrend}
            trendType={trafficTrendType}
            hint={
              analytics
                ? t('cms.dashboard.trafficHint', {
                    time: analytics.avgDwellLabel,
                    views: analytics.pageviews.toLocaleString(),
                  })
                : t('cms.dashboard.viewAnalytics')
            }
            icon={Eye}
            sparklineData={sparklineData}
            onClick={() => navigate('/cms/analytics')}
          />
        ) : null}
        {canStories ? (
          <StatCard
            title={t('cms.dashboard.publishedStories')}
            value={String(publishedToday)}
            trend={t('cms.dashboard.live')}
            trendType={publishedToday > 0 ? 'up' : 'neutral'}
            hint={t('cms.dashboard.viewPublished')}
            icon={FileText}
            onClick={() => navigate('/cms/stories?status=PUBLISHED')}
          />
        ) : null}
        {canStories ? (
          <StatCard
            title={t('cms.dashboard.drafts')}
            value={String(drafts)}
            trend={t('cms.dashboard.needsEdit')}
            trendType="neutral"
            hint={t('cms.dashboard.continueWriting')}
            icon={Clock3}
            onClick={() => navigate('/cms/stories?status=DRAFT')}
          />
        ) : null}
        {canStories || canSubmissions ? (
          <StatCard
            title={t('cms.dashboard.pendingReview')}
            value={String(pending)}
            trend={t('cms.dashboard.actionRequired')}
            trendType={pending > 0 ? 'down' : 'neutral'}
            hint={t('cms.dashboard.reviewQueue')}
            icon={CheckSquare}
            onClick={() =>
              navigate(
                canStories && (checklist?.reviewArticles ?? 0) > 0
                  ? '/cms/stories?status=REVIEW'
                  : canSubmissions
                    ? '/cms/submissions'
                    : '/cms/stories',
              )
            }
          />
        ) : null}
        {canStories ? (
          <StatCard
            title={t('cms.dashboard.scheduled')}
            value={String(scheduled)}
            trend={t('cms.dashboard.upcoming')}
            trendType={scheduled > 0 ? 'up' : 'neutral'}
            hint={t('cms.dashboard.calendar')}
            icon={CalendarDays}
            onClick={() => navigate('/cms/stories?status=SCHEDULED')}
          />
        ) : null}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {canAnalytics ? (
        <CmsCard className="p-6">
          <div className="flex items-center justify-between border-b border-[#E8E4DC] pb-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-800">
                <Flame className="size-4" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-stone-900">
                  {t('cms.dashboard.mostRead')}
                </h2>
                <p className="text-xs text-stone-600">
                  {t('cms.dashboard.mostReadHint')}
                </p>
              </div>
            </div>
            <span className="rounded-full border border-stone-200 bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600">
              {t('cms.dashboard.liveRanking')}
            </span>
          </div>

          <ol className="mt-5 space-y-4">
            {analyticsQuery.isLoading && (
              <li className="text-xs text-stone-500">
                {t('cms.dashboard.loadingTop')}
              </li>
            )}
            {!analyticsQuery.isLoading && topStories.length === 0 && (
              <li className="rounded-xl border border-dashed border-[#E8E4DC] px-3 py-4 text-xs text-stone-500">
                {t('cms.dashboard.emptyTop')}
              </li>
            )}
            {topStories.map((item, index) => (
              <li
                key={item.articleId || item.title}
                onClick={() =>
                  navigate(
                    item.articleId
                      ? `/cms/stories/${item.articleId}`
                      : '/cms/stories',
                  )
                }
                className="group flex cursor-pointer items-center justify-between rounded-xl border border-transparent p-3 transition-all hover:border-[#E8E4DC] hover:bg-stone-50"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0C2686] to-[#4051C7] font-heading text-sm font-bold text-amber-100 shadow-xs">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-stone-900 transition-colors group-hover:text-[#0C2686]">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-stone-600">
                      {t('cms.dashboard.avgTime', { time: item.avgDwellLabel })}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
                  <TrendingUp className="size-3 text-[#0C2686]" />
                  <span>{item.views.toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ol>
        </CmsCard>
        ) : null}

        {canAi ? (
        <CmsCard className="p-6">
          <div className="flex items-center justify-between border-b border-[#E8E4DC] pb-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-800">
                <Bot className="size-4" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-stone-900">
                  {t('cms.dashboard.aiTitle')}
                </h2>
                <p className="text-xs text-stone-600">
                  {t('cms.dashboard.aiHint')}
                </p>
              </div>
            </div>
          </div>

          <ul className="mt-5 space-y-3">
            {checklistQuery.isLoading && (
              <li className="text-xs text-stone-500">
                {t('cms.dashboard.loadingTasks')}
              </li>
            )}
            {aiSuggestions.map((item) => (
              <li key={item.id}>
                <Link
                  to={item.to}
                  className="group flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#E8E4DC] bg-stone-50/70 p-3.5 transition-all hover:border-[#0C2686]/40 hover:bg-white hover:shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="size-4 shrink-0 text-[#0C2686]" />
                    <p className="text-xs font-medium text-stone-800 group-hover:text-stone-900">
                      {item.label}
                    </p>
                  </div>
                  <ArrowUpRight className="size-4 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#0C2686]" />
                </Link>
              </li>
            ))}
          </ul>

          <Link
            to="/cms/ai"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[#E8E4DC] bg-stone-50 py-2.5 text-xs font-bold text-[#0C2686] shadow-2xs transition-all hover:bg-[#0C2686] hover:text-white"
          >
            <Bot className="size-4" />
            {t('cms.dashboard.aiOpen')}
          </Link>
        </CmsCard>
        ) : null}

        <CmsCard className="p-6">
          <div className="flex items-center justify-between border-b border-[#E8E4DC] pb-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-800">
                <ListTodo className="size-4" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-stone-900">
                  {t('cms.dashboard.tasksTitle')}
                </h2>
                <p className="text-xs text-stone-600">
                  {t('cms.dashboard.tasksHint')}
                </p>
              </div>
            </div>
            <span className="rounded-full border border-stone-200 bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600">
              {t('cms.dashboard.completed', {
                done: totalDone,
                total: totalTasks || autoTasks.length || 0,
              })}
            </span>
          </div>

          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">
            {t('cms.dashboard.automated')}
          </p>
          <ul className="mt-2 space-y-2.5">
            {checklistQuery.isLoading && (
              <li className="text-xs text-stone-500">
                {t('cms.dashboard.loadingTasks')}
              </li>
            )}
            {autoTasks.map((task) => (
              <li key={task.id}>
                <Link
                  to={task.to}
                  className={cn(
                    'group flex items-start gap-3 rounded-xl border p-3 transition-all',
                    task.done
                      ? 'border-emerald-200 bg-emerald-50/50 text-stone-400'
                      : 'border-[#E8E4DC] bg-white text-stone-800 hover:border-[#0C2686]/30 hover:bg-stone-50',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-md border',
                      task.done
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-stone-300',
                    )}
                  >
                    {task.done && (
                      <CheckCircle2 className="size-3.5 text-white" />
                    )}
                  </span>
                  <p
                    className={cn(
                      'text-xs font-medium leading-snug',
                      task.done && 'line-through',
                    )}
                  >
                    {task.label}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">
            {t('cms.dashboard.remindMe')}
          </p>
          <ul className="mt-2 space-y-2.5">
            {todosQuery.isLoading && (
              <li className="text-xs text-stone-500">
                {t('cms.dashboard.loadingReminders')}
              </li>
            )}
            {!todosQuery.isLoading && personalTodos.length === 0 && (
              <li className="rounded-xl border border-dashed border-[#E8E4DC] px-3 py-3 text-xs text-stone-500">
                {t('cms.dashboard.emptyReminders')}
              </li>
            )}
            {personalTodos.map((todo) => (
              <li
                key={todo.id}
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-3',
                  todo.done
                    ? 'border-emerald-200 bg-emerald-50/50 text-stone-400'
                    : 'border-[#E8E4DC] bg-white text-stone-800',
                )}
              >
                <button
                  type="button"
                  onClick={() =>
                    updateTodoMutation.mutate({ id: todo.id, done: !todo.done })
                  }
                  className={cn(
                    'mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-md border transition-colors',
                    todo.done
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-stone-300 hover:border-[#0C2686]',
                  )}
                >
                  {todo.done && (
                    <CheckCircle2 className="size-3.5 text-white" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-xs font-medium leading-snug',
                      todo.done && 'line-through',
                    )}
                  >
                    {todo.title}
                  </p>
                  {todo.dueAt && (
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                      {t('cms.dashboard.due', {
                        date: new Date(todo.dueAt).toLocaleDateString(),
                      })}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => deleteTodoMutation.mutate(todo.id)}
                  className="rounded-md p-1 text-stone-400 transition hover:bg-rose-50 hover:text-rose-600"
                  aria-label={t('cms.dashboard.deleteReminder')}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>

          <form
            onSubmit={submitTodo}
            className="mt-4 space-y-2 border-t border-[#E8E4DC] pt-4"
          >
            <input
              value={todoDraft}
              onChange={(e) => setTodoDraft(e.target.value)}
              placeholder={t('cms.dashboard.todoPlaceholder')}
              className="w-full rounded-xl border border-[#E8E4DC] bg-[#FAF8F3] px-3 py-2.5 text-xs font-medium text-stone-900 outline-none focus:border-[#0C2686]"
            />
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={todoDue}
                onChange={(e) => setTodoDue(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-[#E8E4DC] bg-white px-3 py-2 text-xs font-medium text-stone-700 outline-none focus:border-[#0C2686]"
              />
              <button
                type="submit"
                disabled={!todoDraft.trim() || createTodoMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0C2686] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#1A1A1A] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="size-3.5" />
                {t('cms.dashboard.add')}
              </button>
            </div>
          </form>
        </CmsCard>
      </div>
    </div>
  )
}
