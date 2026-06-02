import { FileCheck, ChevronRight } from 'lucide-react'
import type { Approval } from '@/../product/sections/today/types'

interface ApprovalsCardProps {
  approvals: Approval[]
  onViewApproval?: (id: string) => void
}

export function ApprovalsCard({ approvals, onViewApproval }: ApprovalsCardProps) {
  const priorityColors = {
    high: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
    low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  }

  const typeLabels = {
    deliverable: 'Deliverable',
    estimate: 'Estimate',
    draft: 'Draft',
  }

  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Approvals Queue</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Awaiting your review</p>
            </div>
          </div>
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white text-sm font-bold">
            {approvals.length}
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {approvals.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <FileCheck className="w-8 h-8" />
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-medium">No approvals pending</p>
            <p className="text-sm text-slate-500 dark:text-slate-500">You're all caught up!</p>
          </div>
        ) : (
          approvals.map((approval) => (
            <button
              key={approval.id}
              onClick={() => onViewApproval?.(approval.id)}
              className="w-full p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${priorityColors[approval.priority]}`}>
                      {typeLabels[approval.type]}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${priorityColors[approval.priority]}`}>
                      {approval.priority}
                    </span>
                  </div>
                  <h4 className="font-medium text-slate-900 dark:text-white mb-1 truncate">
                    {approval.title}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
                    {approval.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-500">
                    <span>Created by {approval.createdBy}</span>
                    <span>•</span>
                    <span>{approval.projectTitle}</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors flex-shrink-0 mt-1" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
