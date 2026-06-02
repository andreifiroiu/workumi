import { AlertCircle } from 'lucide-react'
import type { WorkOrder, Task } from '@/../product/sections/work/types'
import { MyWorkCard } from './MyWorkCard'

interface MyWorkViewProps {
  workOrders: WorkOrder[]
  tasks: Task[]
  currentUserId: string
  onViewWorkOrder?: (id: string) => void
  onViewTask?: (id: string) => void
  onUpdateWorkOrderStatus?: (id: string, status: WorkOrder['status']) => void
  onUpdateTaskStatus?: (id: string, status: Task['status']) => void
}

export function MyWorkView({
  workOrders,
  tasks,
  currentUserId,
  onViewWorkOrder,
  onViewTask,
}: MyWorkViewProps) {
  // Filter work orders and tasks assigned to current user
  const myWorkOrders = workOrders.filter(wo => wo.assignedToId === currentUserId)
  const myTasks = tasks.filter(t => t.assignedToId === currentUserId)

  // Categorize by priority and status
  const urgentItems = [
    ...myWorkOrders.filter(wo => wo.priority === 'urgent' && wo.status !== 'delivered'),
    ...myTasks.filter(t => t.status !== 'done'),
  ].sort((a, b) => {
    const aDate = new Date(a.dueDate)
    const bDate = new Date(b.dueDate)
    return aDate.getTime() - bDate.getTime()
  })

  const inProgressWorkOrders = myWorkOrders.filter(wo => wo.status === 'active' && wo.priority !== 'urgent')
  const inProgressTasks = myTasks.filter(t => t.status === 'in_progress')

  const todoTasks = myTasks.filter(t => t.status === 'todo' && !t.isBlocked)
  const blockedTasks = myTasks.filter(t => t.isBlocked)

  const inReviewWorkOrders = myWorkOrders.filter(wo => wo.status === 'in_review')

  const hasNoWork = myWorkOrders.length === 0 && myTasks.length === 0

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Work Orders"
          value={myWorkOrders.filter(wo => wo.status !== 'delivered').length}
          total={myWorkOrders.length}
          color="indigo"
        />
        <StatCard
          label="Tasks"
          value={myTasks.filter(t => t.status !== 'done').length}
          total={myTasks.length}
          color="emerald"
        />
        <StatCard
          label="In Review"
          value={inReviewWorkOrders.length}
          color="amber"
        />
        <StatCard
          label="Blocked"
          value={blockedTasks.length}
          color="red"
        />
      </div>

      {hasNoWork ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            All caught up!
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            You don't have any work orders or tasks assigned to you right now.
          </p>
        </div>
      ) : (
        <>
          {/* Urgent Items */}
          {urgentItems.length > 0 && (
            <Section title="Urgent & Overdue" count={urgentItems.length} color="red">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {urgentItems.map(item => {
                  const isWorkOrder = 'projectName' in item
                  return (
                    <MyWorkCard
                      key={item.id}
                      workOrder={isWorkOrder ? (item as WorkOrder) : undefined}
                      task={!isWorkOrder ? (item as Task) : undefined}
                      onView={() => isWorkOrder ? onViewWorkOrder?.(item.id) : onViewTask?.(item.id)}
                    />
                  )
                })}
              </div>
            </Section>
          )}

          {/* In Progress Work Orders */}
          {inProgressWorkOrders.length > 0 && (
            <Section title="Active Work Orders" count={inProgressWorkOrders.length}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {inProgressWorkOrders.map(wo => (
                  <MyWorkCard
                    key={wo.id}
                    workOrder={wo}
                    onView={() => onViewWorkOrder?.(wo.id)}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* In Progress Tasks */}
          {inProgressTasks.length > 0 && (
            <Section title="In Progress Tasks" count={inProgressTasks.length}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inProgressTasks.map(task => (
                  <MyWorkCard
                    key={task.id}
                    task={task}
                    onView={() => onViewTask?.(task.id)}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Todo Tasks */}
          {todoTasks.length > 0 && (
            <Section title="To Do" count={todoTasks.length}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todoTasks.map(task => (
                  <MyWorkCard
                    key={task.id}
                    task={task}
                    onView={() => onViewTask?.(task.id)}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* In Review */}
          {inReviewWorkOrders.length > 0 && (
            <Section title="Awaiting Review" count={inReviewWorkOrders.length} color="amber">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {inReviewWorkOrders.map(wo => (
                  <MyWorkCard
                    key={wo.id}
                    workOrder={wo}
                    onView={() => onViewWorkOrder?.(wo.id)}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Blocked */}
          {blockedTasks.length > 0 && (
            <Section title="Blocked Tasks" count={blockedTasks.length} color="red">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {blockedTasks.map(task => (
                  <MyWorkCard
                    key={task.id}
                    task={task}
                    onView={() => onViewTask?.(task.id)}
                  />
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  )
}

function Section({ title, count, children, color = 'slate' }: { title: string; count?: number; children: React.ReactNode; color?: 'slate' | 'red' | 'amber' }) {
  const colorClasses = {
    slate: 'text-slate-900 dark:text-white',
    red: 'text-red-600 dark:text-red-400',
    amber: 'text-amber-600 dark:text-amber-400',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-lg font-bold ${colorClasses[color]}`}>
          {title}
          {count !== undefined && (
            <span className="ml-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              ({count})
            </span>
          )}
        </h2>
      </div>
      {children}
    </div>
  )
}

function StatCard({ label, value, total, color = 'slate' }: { label: string; value: number; total?: number; color?: 'indigo' | 'emerald' | 'amber' | 'red' | 'slate' }) {
  const colorClasses = {
    indigo: 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400',
    red: 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400',
    slate: 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400',
  }

  return (
    <div className={`p-4 rounded-xl ${colorClasses[color]}`}>
      <div className="text-2xl font-bold mb-1">
        {value}
        {total !== undefined && (
          <span className="text-sm font-normal opacity-60">/{total}</span>
        )}
      </div>
      <div className="text-sm font-medium opacity-80">{label}</div>
    </div>
  )
}
