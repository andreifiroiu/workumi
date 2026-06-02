import type {
  ProjectStatusReport,
  ReportViewMode,
  TimeRange,
} from '@/../product/sections/reports/types'
import { ReportCardHeader } from './ReportCardHeader'

interface ProjectStatusCardProps {
  reports: ProjectStatusReport[]
  viewMode: ReportViewMode
  timeRange: TimeRange
  onTimeRangeChange?: (range: TimeRange) => void
  onView?: (projectId: string) => void
  onDrillDown?: (entityType: string, entityId: string) => void
  onExport?: () => void
}

export function ProjectStatusCard({
  reports,
  timeRange,
  onTimeRangeChange,
  onView,
  onExport,
}: ProjectStatusCardProps) {
  const onTrack = reports.filter((r) => r.status === 'on-track').length
  const atRisk = reports.filter((r) => r.status === 'at-risk').length
  const overdue = reports.filter((r) => r.status === 'overdue').length

  const getStatusColor = (status: string) => {
    const colors = {
      'on-track': 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30',
      'at-risk': 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30',
      overdue: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30',
    }
    return colors[status as keyof typeof colors]
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 hover:shadow-lg transition-shadow">
      <ReportCardHeader
        title="Project Status"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        }
        timeRange={timeRange}
        onTimeRangeChange={onTimeRangeChange}
        onExport={onExport}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            {onTrack}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">On Track</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">{atRisk}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">At Risk</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-red-600 dark:text-red-400">{overdue}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Overdue</p>
        </div>
      </div>

      {/* Project List */}
      <div className="space-y-2">
        {reports.slice(0, 5).map((report) => (
          <button
            key={report.id}
            onClick={() => onView?.(report.projectId)}
            className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">
                  {report.projectName}
                </p>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(report.status)}`}
                >
                  {report.status.replace('-', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {report.completionPercentage}% complete • Health: {report.healthScore}/100
              </p>
            </div>
            <svg
              className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}
