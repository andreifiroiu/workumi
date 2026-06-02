import { useState } from 'react'
import { Search } from 'lucide-react'
import type { WorkProps, WorkView } from '@/../product/sections/work/types'
import { ViewTabs } from './ViewTabs'
import { QuickAddBar } from './QuickAddBar'
import { ProjectTreeItem } from './ProjectTreeItem'
import { MyWorkView } from './MyWorkView'
import { KanbanView } from './KanbanView'
import { CalendarView } from './CalendarView'
import { ArchiveView } from './ArchiveView'

// Design tokens: Primary (indigo), Secondary (emerald), Neutral (slate)
// Typography: Inter for headings and body, IBM Plex Mono for code

export function Work({
  projects,
  workOrders,
  tasks,
  currentView = 'all_projects',
  currentUserId,
  onViewChange,
  onViewProject,
  onCreateProject,
  onArchiveProject,
  onViewWorkOrder,
  onCreateWorkOrder,
  onUpdateWorkOrderStatus,
  onViewTask,
  onCreateTask,
  onUpdateTaskStatus,
  onSearch,
}: WorkProps) {
  const [view, setView] = useState<WorkView>(currentView)
  const [searchQuery, setSearchQuery] = useState('')

  const handleViewChange = (newView: WorkView) => {
    setView(newView)
    onViewChange?.(newView)
  }

  const handleQuickAdd = (data: { type: string; title: string; parentId?: string }) => {
    if (data.type === 'project') {
      onCreateProject?.({ type: 'project', title: data.title })
    } else if (data.type === 'workOrder' && data.parentId) {
      onCreateWorkOrder?.({ type: 'workOrder', title: data.title, parentId: data.parentId })
    } else if (data.type === 'task' && data.parentId) {
      onCreateTask?.({ type: 'task', title: data.title, parentId: data.parentId })
    }
  }

  const filteredProjects = searchQuery
    ? projects.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : projects

  const activeProjects = filteredProjects.filter(p => p.status === 'active')

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="px-6 py-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Work</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage projects, work orders, tasks, and deliverables
          </p>
        </div>

        {/* View Tabs */}
        <ViewTabs currentView={view} onViewChange={handleViewChange} />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Search and Filter Bar */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                onSearch?.(e.target.value)
              }}
              placeholder="Search projects, work orders, tasks..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            />
          </div>
        </div>

        {/* All Projects View */}
        {view === 'all_projects' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <QuickAddBar onQuickAdd={handleQuickAdd} />

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {activeProjects.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    {searchQuery ? 'No projects found' : 'No active projects'}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                    {searchQuery
                      ? 'Try adjusting your search query'
                      : 'Get started by creating your first project'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => handleQuickAdd({ type: 'project', title: 'New Project' })}
                      className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
                    >
                      Create First Project
                    </button>
                  )}
                </div>
              ) : (
                activeProjects.map(project => (
                  <ProjectTreeItem
                    key={project.id}
                    project={project}
                    workOrders={workOrders}
                    tasks={tasks}
                    onViewProject={onViewProject}
                    onCreateWorkOrder={(projectId) => handleQuickAdd({ type: 'workOrder', title: 'New Work Order', parentId: projectId })}
                    onViewWorkOrder={onViewWorkOrder}
                    onCreateTask={(workOrderId) => handleQuickAdd({ type: 'task', title: 'New Task', parentId: workOrderId })}
                    onViewTask={onViewTask}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* My Work View */}
        {view === 'my_work' && (
          <MyWorkView
            workOrders={workOrders}
            tasks={tasks}
            currentUserId={currentUserId || 'tm-001'}
            onViewWorkOrder={onViewWorkOrder}
            onViewTask={onViewTask}
            onUpdateWorkOrderStatus={onUpdateWorkOrderStatus}
            onUpdateTaskStatus={onUpdateTaskStatus}
          />
        )}

        {/* By Status (Kanban) View */}
        {view === 'by_status' && (
          <KanbanView
            workOrders={workOrders}
            onViewWorkOrder={onViewWorkOrder}
            onCreateWorkOrder={onCreateWorkOrder}
            onUpdateWorkOrderStatus={onUpdateWorkOrderStatus}
          />
        )}

        {/* Calendar View */}
        {view === 'calendar' && (
          <CalendarView
            projects={projects}
            workOrders={workOrders}
            onViewProject={onViewProject}
            onViewWorkOrder={onViewWorkOrder}
          />
        )}

        {/* Archive View */}
        {view === 'archive' && (
          <ArchiveView
            projects={projects}
            workOrders={workOrders}
            tasks={tasks}
            onViewProject={onViewProject}
            onRestoreProject={onArchiveProject}
          />
        )}
      </div>
    </div>
  )
}
