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
import { cmsAiSuggestions } from '@/cms/data/mock'
import { useAuth } from '@/lib/auth'
import { getAnalyticsSummary } from '@/lib/analytics-api'
import {
  createCmsTodo,
  deleteCmsTodo,
  getDashboardChecklist,
  listCmsTodos,
  updateCmsTodo,
} from '@/lib/dashboard-api'
import { formatTrendPct } from '@/lib/format'
import { cn } from '@/lib/utils'

export default function CmsDashboard() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month'>('today')
  const [aiMessage, setAiMessage] = useState<string | null>(null)
  const [todoDraft, setTodoDraft] = useState('')
  const [todoDue, setTodoDue] = useState('')

  const firstName =
    user?.name?.trim().split(/\s+/)[0] ||
    user?.email?.split('@')[0] ||
    t('cms.editorRole')

  const checklistQuery = useQuery({
    queryKey: ['cms-dashboard-checklist'],
    queryFn: getDashboardChecklist,
  })

  const analyticsQuery = useQuery({
    queryKey: ['cms-analytics-summary', timeframe],
    queryFn: () => getAnalyticsSummary(timeframe),
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

  const handleAiAction = (suggestion: string) => {
    setAiMessage(`AI Action triggered: "${suggestion}". Generating preview...`)
    setTimeout(() => setAiMessage(null), 4000)
  }

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
    analytics?.daily?.map((d) => d.views) ?? [0, 0, 0, 0, 0, 0, 0]
  const topStories = analytics?.topStories ?? []

  const autoTasks = useMemo(() => {
    const data = checklistQuery.data
    if (!data) return []
    return [
      {
        id: 'submissions',
        label:
          data.pendingSubmissions === 0
            ? 'Review Write for Us submissions'
            : `Review ${data.pendingSubmissions} Write for Us submission${data.pendingSubmissions === 1 ? '' : 's'}`,
        done: data.pendingSubmissions === 0,
        to: '/cms/submissions',
      },
      {
        id: 'review',
        label:
          data.reviewArticles === 0
            ? 'Clear stories in review'
            : `Clear ${data.reviewArticles} stor${data.reviewArticles === 1 ? 'y' : 'ies'} in review`,
        done: data.reviewArticles === 0,
        to: '/cms/stories',
      },
      {
        id: 'translations',
        label:
          data.failedTranslations === 0
            ? 'Fix failed translations'
            : `Fix ${data.failedTranslations} failed translation${data.failedTranslations === 1 ? '' : 's'}`,
        done: data.failedTranslations === 0,
        to: '/cms/stories',
      },
      {
        id: 'publish',
        label:
          data.publishedToday > 0
            ? `Published ${data.publishedToday} stor${data.publishedToday === 1 ? 'y' : 'ies'} today`
            : 'Publish at least one story today',
        done: data.publishedToday > 0,
        to: '/cms/stories',
      },
    ]
  }, [checklistQuery.data])

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

  return (
    <div>
      <CmsPageHeader
        title={`${greeting}, ${firstName}`}
        description={t('cms.dashboard.desk', { date: today })}
        badge={t('cms.dashboard.activeSession')}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-xl border border-[#E8E4DC] bg-white p-1 shadow-2xs">
              {(['today', 'week', 'month'] as const).map((tf) => (
                <button
                  key={tf}
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

            <Link to="/cms/stories/new">
              <PrimaryButton>
                <Plus className="size-4" />
                {t('cms.dashboard.newStory')}
              </PrimaryButton>
            </Link>
          </div>
        }
      />

      {aiMessage && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50/90 px-4 py-3 text-sm text-blue-900 shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <Sparkles className="size-4 text-[#0C2686] animate-pulse" />
            <span className="font-medium">{aiMessage}</span>
          </div>
          <button
            onClick={() => setAiMessage(null)}
            className="font-bold text-blue-700 hover:text-blue-950"
          >
            {t('cms.dashboard.dismiss')}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          title={t('cms.dashboard.traffic')}
          value={trafficValue}
          trend={trafficTrend}
          trendType={trafficTrendType}
          hint={
            analytics
              ? `Avg time ${analytics.avgDwellLabel} · ${analytics.pageviews.toLocaleString()} views`
              : t('cms.dashboard.viewAnalytics')
          }
          icon={Eye}
          sparklineData={sparklineData}
          onClick={() => navigate('/cms/analytics')}
        />
        <StatCard
          title={t('cms.dashboard.publishedStories')}
          value={String(publishedToday)}
          trend={t('cms.dashboard.live')}
          trendType="up"
          hint={t('cms.dashboard.viewPublished')}
          icon={FileText}
          sparklineData={[2, 3, 3, 4, 3, 5, 6]}
          onClick={() => navigate('/cms/stories')}
        />
        <StatCard
          title={t('cms.dashboard.drafts')}
          value={String(drafts)}
          trend={t('cms.dashboard.needsEdit')}
          trendType="neutral"
          hint={t('cms.dashboard.continueWriting')}
          icon={Clock3}
          sparklineData={[5, 4, 6, 5, 4, 3, 2]}
          onClick={() => navigate('/cms/stories')}
        />
        <StatCard
          title={t('cms.dashboard.pendingReview')}
          value={String(pending)}
          trend={t('cms.dashboard.actionRequired')}
          trendType="down"
          hint={t('cms.dashboard.reviewQueue')}
          icon={CheckSquare}
          sparklineData={[1, 2, 4, 3, 5, 4, 3]}
          onClick={() => navigate('/cms/submissions')}
        />
        <StatCard
          title={t('cms.dashboard.scheduled')}
          value={String(scheduled)}
          trend={t('cms.dashboard.upcoming')}
          trendType="up"
          hint={t('cms.dashboard.calendar')}
          icon={CalendarDays}
          sparklineData={[1, 1, 2, 2, 3, 2, 1]}
          onClick={() => navigate('/cms/stories')}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
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
                <p className="text-xs text-stone-600">{t('cms.dashboard.mostReadHint')}</p>
              </div>
            </div>
            <span className="rounded-full border border-stone-200 bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600">
              {t('cms.dashboard.liveRanking')}
            </span>
          </div>

          <ol className="mt-5 space-y-4">
            {analyticsQuery.isLoading && (
              <li className="text-xs text-stone-500">Loading top stories…</li>
            )}
            {!analyticsQuery.isLoading && topStories.length === 0 && (
              <li className="rounded-xl border border-dashed border-[#E8E4DC] px-3 py-4 text-xs text-stone-500">
                No story visits yet for this period.
              </li>
            )}
            {topStories.map((item, index) => (
              <li
                key={item.articleId || item.title}
                onClick={() => navigate('/cms/stories')}
                className="group flex cursor-pointer items-center justify-between rounded-xl border border-transparent p-3 transition-all hover:border-[#E8E4DC] hover:bg-stone-50"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0C2686] to-[#4051C7] font-heading text-sm font-bold text-amber-100 shadow-xs">
                    0{index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-stone-900 transition-colors group-hover:text-[#0C2686]">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-stone-600">
                      Avg time {item.avgDwellLabel}
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

        <CmsCard className="p-6">
          <div className="flex items-center justify-between border-b border-[#E8E4DC] pb-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-800">
                <Bot className="size-4" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-stone-900">AI Assistant</h2>
                <p className="text-xs text-stone-600">Smart editorial optimizations</p>
              </div>
            </div>
          </div>

          <ul className="mt-5 space-y-3">
            {cmsAiSuggestions.map((item) => (
              <li
                key={item}
                onClick={() => handleAiAction(item)}
                className="group flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#E8E4DC] bg-stone-50/70 p-3.5 transition-all hover:border-[#0C2686]/40 hover:bg-white hover:shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="size-4 shrink-0 text-[#0C2686]" />
                  <p className="text-xs font-medium text-stone-800 group-hover:text-stone-900">
                    {item}
                  </p>
                </div>
                <ArrowUpRight className="size-4 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#0C2686]" />
              </li>
            ))}
          </ul>

          <Link
            to="/cms/ai"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[#E8E4DC] bg-stone-50 py-2.5 text-xs font-bold text-[#0C2686] shadow-2xs transition-all hover:bg-[#0C2686] hover:text-white"
          >
            <Bot className="size-4" />
            Open Full AI Command Center
          </Link>
        </CmsCard>

        <CmsCard className="p-6">
          <div className="flex items-center justify-between border-b border-[#E8E4DC] pb-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-800">
                <ListTodo className="size-4" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-stone-900">Today’s Tasks</h2>
                <p className="text-xs text-stone-600">Editorial checklist + reminders</p>
              </div>
            </div>
            <span className="rounded-full border border-stone-200 bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600">
              {totalDone}/{totalTasks || autoTasks.length || 0} Completed
            </span>
          </div>

          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">
            Automated
          </p>
          <ul className="mt-2 space-y-2.5">
            {checklistQuery.isLoading && (
              <li className="text-xs text-stone-500">Loading checklist…</li>
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
                    {task.done && <CheckCircle2 className="size-3.5 text-white" />}
                  </span>
                  <p className={cn('text-xs font-medium leading-snug', task.done && 'line-through')}>
                    {task.label}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">
            Remind me
          </p>
          <ul className="mt-2 space-y-2.5">
            {todosQuery.isLoading && (
              <li className="text-xs text-stone-500">Loading reminders…</li>
            )}
            {!todosQuery.isLoading && personalTodos.length === 0 && (
              <li className="rounded-xl border border-dashed border-[#E8E4DC] px-3 py-3 text-xs text-stone-500">
                Add a personal reminder below.
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
                  {todo.done && <CheckCircle2 className="size-3.5 text-white" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-xs font-medium leading-snug', todo.done && 'line-through')}>
                    {todo.title}
                  </p>
                  {todo.dueAt && (
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                      Due {new Date(todo.dueAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => deleteTodoMutation.mutate(todo.id)}
                  className="rounded-md p-1 text-stone-400 transition hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Delete reminder"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>

          <form onSubmit={submitTodo} className="mt-4 space-y-2 border-t border-[#E8E4DC] pt-4">
            <input
              value={todoDraft}
              onChange={(e) => setTodoDraft(e.target.value)}
              placeholder="Remind me to…"
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
                Add
              </button>
            </div>
          </form>
        </CmsCard>
      </div>
    </div>
  )
}
