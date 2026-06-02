import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { WorkOrder } from '@/../product/sections/work/types'
import { KanbanColumn } from './KanbanColumn'

interface KanbanViewProps {
  workOrders: WorkOrder[]
  onViewWorkOrder?: (id: string) => void
  onCreateWorkOrder?: (data: { status: WorkOrder['status'] }) => void
  onUpdateWorkOrderStatus?: (id: string, status: WorkOrder['status']) => void
}

export function KanbanView({
  workOrders,
  onViewWorkOrder,
  onCreateWorkOrder,
  onUpdateWorkOrderStatus,
}: KanbanViewProps) {
  const columns: Array<{
    status: WorkOrder['status']
    title: string
  }> = [
    { status: 'draft', title: 'Draft' },
    { status: 'active', title: 'Active' },
    { status: 'in_review', title: 'In Review' },
    { status: 'approved', title: 'Approved' },
    { status: 'delivered', title: 'Delivered' },
  ]

  const workOrdersByStatus = columns.map(column => ({
    ...column,
    workOrders: workOrders
      .filter(wo => wo.status === column.status)
      .sort((a, b) => {
        // Sort by priority (urgent first), then by due date
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
        const aPriority = priorityOrder[a.priority]
        const bPriority = priorityOrder[b.priority]
        if (aPriority !== bPriority) return aPriority - bPriority
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      }),
  }))

  const totalWorkOrders = workOrders.length
  const activeCount = workOrders.filter(wo => wo.status !== 'delivered').length

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="flex items-center gap-6">
        <div className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {activeCount}
            <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-1">
              / {totalWorkOrders}
            </span>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">Active Work Orders</div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          Organize work orders by status. Click a card to view details or use the + button to create new work orders in each column.
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {workOrdersByStatus.map(column => (
            <KanbanColumn
              key={column.status}
              status={column.status}
              title={column.title}
              workOrders={column.workOrders}
              onViewWorkOrder={onViewWorkOrder}
              onCreateWorkOrder={onCreateWorkOrder}
              onUpdateWorkOrderStatus={onUpdateWorkOrderStatus}
            />
          ))}
        </div>
      </div>

      {/* Empty State */}
      {totalWorkOrders === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <ArrowRight className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            No work orders yet
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Create your first work order to get started with the kanban board.
          </p>
          <button
            onClick={() => onCreateWorkOrder?.({ status: 'draft' })}
            className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
          >
            Create Work Order
          </button>
        </div>
      )}

      {/* Drag and Drop Info */}
      {totalWorkOrders > 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 rounded-lg p-3">
          <ArrowLeft className="w-4 h-4" />
          <span>
            <strong>Tip:</strong> Click on any work order card to view details and update its status. Use the + button in each column header to add new work orders.
          </span>
        </div>
      )}
    </div>
  )
}
