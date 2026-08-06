import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
} from 'lucide-react'
import {
  CmsCard,
  CmsPageHeader,
  PrimaryButton,
  StatCard,
} from '@/cms/components/CmsUI'
import {
  cmsAiSuggestions,
  cmsMostRead,
  cmsStories,
  cmsSubmissions,
  cmsTasks,
} from '@/cms/data/mock'
import { cn } from '@/lib/utils'

export default function CmsDashboard() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month'>('today')
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({})
  const [aiMessage, setAiMessage] = useState<string | null>(null)

  const toggleTask = (task: string) => {
    setCompletedTasks((prev) => ({ ...prev, [task]: !prev[task] }))
  }

  const handleAiAction = (suggestion: string) => {
    setAiMessage(`AI Action triggered: "${suggestion}". Generating preview...`)
    setTimeout(() => setAiMessage(null), 4000)
  }

  const drafts = cmsStories.filter((s) => s.status === 'draft').length
  const scheduled = cmsStories.filter((s) => s.status === 'scheduled').length
  const pending = cmsStories.filter((s) => s.status === 'review').length +
    cmsSubmissions.filter((s) => s.status === 'new' || s.status === 'review').length
  const publishedToday = cmsStories.filter((s) => s.status === 'published').length

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

  // Dynamic multiplier for timeframe selector
  const trafficValue =
    timeframe === 'today' ? '24,580' : timeframe === 'week' ? '168,420' : '712,050'
  const trafficTrend = timeframe === 'today' ? '+12.4%' : timeframe === 'week' ? '+18.2%' : '+24.6%'

  return (
    <div>
      {/* Page Header */}
      <CmsPageHeader
        title={`${greeting}, Albena`}
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

      {/* AI Action Toast Alert */}
      {aiMessage && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50/90 px-4 py-3 text-sm text-blue-900 shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <Sparkles className="size-4 text-[#0C2686] animate-pulse" />
            <span className="font-medium">{aiMessage}</span>
          </div>
          <button onClick={() => setAiMessage(null)} className="text-blue-700 hover:text-blue-950 font-bold">
            {t('cms.dashboard.dismiss')}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          title={t('cms.dashboard.traffic')}
          value={trafficValue}
          trend={trafficTrend}
          trendType="up"
          hint={t('cms.dashboard.viewAnalytics')}
          icon={Eye}
          sparklineData={[14, 18, 22, 19, 28, 31, 38]}
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

      {/* Detailed Dashboard Content Grids */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Most Read Today */}
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
            <span className="text-xs font-semibold text-stone-600 bg-stone-100 px-2.5 py-1 rounded-full border border-stone-200">
              {t('cms.dashboard.liveRanking')}
            </span>
          </div>

          <ol className="mt-5 space-y-4">
            {cmsMostRead.map((item, index) => (
              <li
                key={item.title}
                onClick={() => navigate('/cms/stories')}
                className="group flex items-center justify-between p-3 rounded-xl hover:bg-stone-50 transition-all border border-transparent hover:border-[#E8E4DC] cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0C2686] to-[#4051C7] font-heading text-sm font-bold text-amber-100 shadow-xs">
                    0{index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-stone-900 group-hover:text-[#0C2686] transition-colors">
                      {item.title}
                    </p>
                    <p className="text-xs font-medium text-stone-600 mt-0.5">
                      Northwestern Bulgaria Series
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 bg-stone-100 px-2.5 py-1 rounded-lg text-xs font-semibold text-stone-700">
                  <TrendingUp className="size-3 text-[#0C2686]" />
                  <span>{item.views.toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ol>
        </CmsCard>

        {/* AI Assistant Suggestions */}
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
                className="group flex items-center justify-between gap-3 rounded-xl border border-[#E8E4DC] bg-stone-50/70 p-3.5 transition-all hover:border-[#0C2686]/40 hover:bg-white hover:shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="size-4 text-[#0C2686] shrink-0" />
                  <p className="text-xs font-medium text-stone-800 group-hover:text-stone-900">{item}</p>
                </div>
                <ArrowUpRight className="size-4 shrink-0 text-stone-400 group-hover:text-[#0C2686] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </li>
            ))}
          </ul>

          <Link
            to="/cms/ai"
            className="mt-5 flex items-center justify-center gap-2 w-full rounded-xl border border-[#E8E4DC] bg-stone-50 py-2.5 text-xs font-bold text-[#0C2686] hover:bg-[#0C2686] hover:text-white transition-all shadow-2xs"
          >
            <Bot className="size-4" />
            Open Full AI Command Center
          </Link>
        </CmsCard>

        {/* Interactive Today's Tasks */}
        <CmsCard className="p-6">
          <div className="flex items-center justify-between border-b border-[#E8E4DC] pb-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-800">
                <ListTodo className="size-4" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-stone-900">Today’s Tasks</h2>
                <p className="text-xs text-stone-600">Editorial checklist</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-stone-600 bg-stone-100 px-2.5 py-1 rounded-full border border-stone-200">
              {Object.values(completedTasks).filter(Boolean).length}/{cmsTasks.length} Completed
            </span>
          </div>

          <ul className="mt-5 space-y-3">
            {cmsTasks.map((task) => {
              const isDone = completedTasks[task]
              return (
                <li
                  key={task}
                  onClick={() => toggleTask(task)}
                  className={cn(
                    'group flex items-start gap-3 rounded-xl border p-3 transition-all cursor-pointer',
                    isDone
                      ? 'border-emerald-200 bg-emerald-50/50 text-stone-400 line-through'
                      : 'border-[#E8E4DC] bg-white hover:border-[#0C2686]/30 hover:bg-stone-50 text-stone-800',
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      'mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-md border transition-colors',
                      isDone
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-stone-300 group-hover:border-[#0C2686]',
                    )}
                  >
                    {isDone && <CheckCircle2 className="size-3.5 text-white" />}
                  </button>
                  <p className="text-xs font-medium leading-snug">{task}</p>
                </li>
              )
            })}
          </ul>

          <Link
            to="/cms/submissions"
            className="mt-5 flex items-center justify-center gap-2 w-full rounded-xl border border-[#E8E4DC] bg-stone-50 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-900 hover:text-white transition-all shadow-2xs"
          >
            Review Submissions Queue
          </Link>
        </CmsCard>
      </div>
    </div>
  )
}

