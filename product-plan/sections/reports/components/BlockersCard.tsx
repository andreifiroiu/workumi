import type {
  BlockerReport,
  ReportViewMode,
  TimeRange,
} from '@/../product/sections/reports/types'
import { ReportCardHeader } from './ReportCardHeader'

interface BlockersCardProps {
  reports: BlockerReport[]
  viewMode: ReportViewMode
  timeRange: TimeRange
  onTimeRangeChange?: (range: TimeRange) => void
  onView?: (blockerId: string) => void
  onResolve?: (blockerId: string) => void
  onDrillDown?: (entityType: string, entityId: string) => void
  onExport?: () => void
}

export function BlockersCard({
  reports,
  timeRange,
  onTimeRangeChange,
  onView,
  onResolve,
  onExport,
}: BlockersCardProps) {
  const criticalBlockers = reports.filter((r) => r.impact === 'critical').length

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 hover:shadow-lg transition-shadow">
      <ReportCardHeader
        title="Blockers"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        }
        timeRange={timeRange}
        onTimeRangeChange={onTimeRangeChange}
        onExport={onExport}
      />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            {reports.length}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Total Blockers</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
            {criticalBlockers}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Critical</p>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-slate-600 dark:text-slate-400">No blockers detected</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.slice(0, 5).map((report) => (
            <div
              key={report.id}
              className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <button
                  onClick={() => onView?.(report.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate mb-1">
                    {report.itemName}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Blocked {report.daysBlocked}d • {report.blockedBy}
                  </p>
                </button>
                <button
                  onClick={() => onResolve?.(report.id)}
                  className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors flex-shrink-0"
                >
                  Resolve
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                {report.actionRequired}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
