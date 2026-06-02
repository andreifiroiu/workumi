import type { TodayProps } from '@/../product/sections/today/types'
import { DailySummaryCard } from './DailySummaryCard'
import { MetricsBar } from './MetricsBar'
import { ApprovalsCard } from './ApprovalsCard'
import { TasksCard } from './TasksCard'
import { BlockersCard } from './BlockersCard'
import { UpcomingDeadlinesCard } from './UpcomingDeadlinesCard'
import { ActivityFeed } from './ActivityFeed'
import { QuickCapture } from './QuickCapture'

// Design tokens: Primary (indigo), Secondary (emerald), Neutral (slate)
// Typography: Inter for headings and body, IBM Plex Mono for code

export function Today({
  dailySummary,
  approvals,
  tasks,
  blockers,
  upcomingDeadlines,
  activities,
  metrics,
  onViewApproval,
  onViewTask,
  onViewBlocker,
  onViewWorkOrder,
  onViewActivity,
  onQuickCapture,
  onRefreshSummary,
}: TodayProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Today</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Your command center for what needs attention right now
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Daily summary - full width at top */}
        <DailySummaryCard summary={dailySummary} onRefresh={onRefreshSummary} />

        {/* Metrics bar - full width */}
        <MetricsBar metrics={metrics} />

        {/* Dashboard grid - responsive 2 column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            <ApprovalsCard approvals={approvals} onViewApproval={onViewApproval} />
            <TasksCard tasks={tasks} onViewTask={onViewTask} />
            <BlockersCard blockers={blockers} onViewBlocker={onViewBlocker} />
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <UpcomingDeadlinesCard deadlines={upcomingDeadlines} onViewWorkOrder={onViewWorkOrder} />
            <ActivityFeed activities={activities} onViewActivity={onViewActivity} />
          </div>
        </div>
      </div>

      {/* Quick capture floating button */}
      <QuickCapture onQuickCapture={onQuickCapture} />
    </div>
  )
}
