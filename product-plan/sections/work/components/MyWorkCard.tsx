import { Clock, AlertCircle, CheckCircle2, User } from 'lucide-react'
import type { WorkOrder, Task } from '@/../product/sections/work/types'

interface MyWorkCardProps {
  workOrder?: WorkOrder
  task?: Task
  onView?: () => void
  onUpdateStatus?: () => void
}

export function MyWorkCard({ workOrder, task, onView, onUpdateStatus }: MyWorkCardProps) {
  if (workOrder) {
    return <WorkOrderCard workOrder={workOrder} onView={onView} onUpdateStatus={onUpdateStatus} />
  }

  if (task) {
    return <TaskCard task={task} onView={onView} onUpdateStatus={onUpdateStatus} />
  }

  return null
}

function WorkOrderCard({ workOrder, onView }: { workOrder: WorkOrder; onView?: () => void; onUpdateStatus?: () => void }) {
  const statusColors = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
    active: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400',
    in_review: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
    delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  }

  const priorityColors = {
    low: 'border-l-slate-300 dark:border-l-slate-700',
    medium: 'border-l-amber-400 dark:border-l-amber-500',
    high: 'border-l-orange-500 dark:border-l-orange-500',
    urgent: 'border-l-red-500 dark:border-l-red-500',
  }

  const dueDate = new Date(workOrder.dueDate)
  const now = new Date()
  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isOverdue = daysUntilDue < 0

  return (
    <button
      onClick={onView}
      className={`w-full text-left p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ${priorityColors[workOrder.priority]} border-l-4 rounded-lg hover:shadow-md dark:hover:shadow-slate-950/50 transition-all group`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[workOrder.status]}`}>
              {workOrder.status.replace('_', ' ')}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
              {workOrder.priority}
            </span>
            {workOrder.sopAttached && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400">
                SOP
              </span>
            )}
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {workOrder.title}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
            {workOrder.description}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <User size={14} />
            {workOrder.projectName}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {workOrder.actualHours}/{workOrder.estimatedHours}h
          </span>
        </div>
        <div className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-red-600 dark:text-red-400' : ''}`}>
          {isOverdue ? <AlertCircle size={14} /> : <Clock size={14} />}
          {isOverdue ? `${Math.abs(daysUntilDue)}d overdue` : `${daysUntilDue}d left`}
        </div>
      </div>

      {workOrder.acceptanceCriteria.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Acceptance Criteria:</p>
          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
            {workOrder.acceptanceCriteria.slice(0, 2).map((criteria, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-slate-400">•</span>
                <span className="flex-1 line-clamp-1">{criteria}</span>
              </li>
            ))}
            {workOrder.acceptanceCriteria.length > 2 && (
              <li className="text-slate-400">+{workOrder.acceptanceCriteria.length - 2} more</li>
            )}
          </ul>
        </div>
      )}
    </button>
  )
}

function TaskCard({ task, onView }: { task: Task; onView?: () => void; onUpdateStatus?: () => void }) {
  const statusColors = {
    todo: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
    in_progress: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400',
    done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  }

  const dueDate = new Date(task.dueDate)
  const now = new Date()
  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isOverdue = daysUntilDue < 0

  const completedItems = task.checklistItems.filter(item => item.completed).length
  const totalItems = task.checklistItems.length
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0

  return (
    <button
      onClick={onView}
      className="w-full text-left p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:shadow-md dark:hover:shadow-slate-950/50 transition-all group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[task.status]}`}>
              {task.status.replace('_', ' ')}
            </span>
            {task.isBlocked && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 flex items-center gap-1">
                <AlertCircle size={12} />
                Blocked
              </span>
            )}
          </div>
          <h4 className={`text-sm font-medium mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors ${task.isBlocked ? 'line-through text-slate-500 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
            {task.title}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            {task.workOrderTitle}
          </p>
        </div>
      </div>

      {totalItems > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
            <span>{completedItems}/{totalItems} checklist items</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {task.actualHours}/{task.estimatedHours}h
        </span>
        <div className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-red-600 dark:text-red-400' : ''}`}>
          {isOverdue ? <AlertCircle size={12} /> : task.status === 'done' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
          {task.status === 'done' ? 'Completed' : isOverdue ? `${Math.abs(daysUntilDue)}d overdue` : `${daysUntilDue}d left`}
        </div>
      </div>
    </button>
  )
}
