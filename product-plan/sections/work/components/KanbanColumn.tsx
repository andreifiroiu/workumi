import { Plus } from 'lucide-react'
import type { WorkOrder } from '@/../product/sections/work/types'
import { MyWorkCard } from './MyWorkCard'

interface KanbanColumnProps {
  status: WorkOrder['status']
  title: string
  workOrders: WorkOrder[]
  onViewWorkOrder?: (id: string) => void
  onCreateWorkOrder?: (data: { status: WorkOrder['status'] }) => void
  onUpdateWorkOrderStatus?: (id: string, status: WorkOrder['status']) => void
}

export function KanbanColumn({
  status,
  title,
  workOrders,
  onViewWorkOrder,
  onCreateWorkOrder,
}: KanbanColumnProps) {
  const statusColors = {
    draft: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    active: 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300',
    in_review: 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
    approved: 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300',
    delivered: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
  }

  return (
    <div className="flex flex-col min-w-[320px] max-w-[320px] shrink-0">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {title}
          </h3>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}>
            {workOrders.length}
          </span>
        </div>
        <button
          onClick={() => onCreateWorkOrder?.({ status })}
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          title="Add work order"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Column Content */}
      <div className="flex-1 space-y-3 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-800 min-h-[400px]">
        {workOrders.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-slate-400 dark:text-slate-500">
            No work orders
          </div>
        ) : (
          workOrders.map(workOrder => (
            <div
              key={workOrder.id}
              className="cursor-pointer transition-transform hover:scale-[1.02]"
            >
              <MyWorkCard
                workOrder={workOrder}
                onView={() => onViewWorkOrder?.(workOrder.id)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
