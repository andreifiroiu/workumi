import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import type { TodayApproval, TodayTask, TodayBlocker, QuickCaptureData, TodayPageProps } from '@/types/today';
import { getCsrfToken } from '@/lib/csrf';
import {
    DailySummaryCard,
    MetricsBar,
    ApprovalsCard,
    TasksCard,
    BlockersCard,
    UpcomingDeadlinesCard,
    ActivityFeed,
    QuickCapture,
    ApprovalSheet,
    TaskSheet,
    BlockerSheet,
} from '@/components/today';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Today', href: '/today' }];

export default function Today({
    dailySummary,
    approvals,
    tasks,
    blockers,
    upcomingDeadlines,
    activities,
    metrics,
}: TodayPageProps) {

    // Local state for selected items
    const [selectedApproval, setSelectedApproval] = useState<TodayApproval | null>(null);
    const [selectedTask, setSelectedTask] = useState<TodayTask | null>(null);
    const [selectedBlocker, setSelectedBlocker] = useState<TodayBlocker | null>(null);

    // Handlers for approvals
    const handleViewApproval = (id: string) => {
        const approval = approvals.find((a) => a.id === id);
        if (approval) {
            setSelectedApproval(approval);
        }
    };

    const handleApprove = (id: string) => {
        // TODO: Implement API call
        console.log('Approved:', id);
    };

    const handleReject = (id: string, reason?: string) => {
        // TODO: Implement API call
        console.log('Rejected:', id, reason);
    };

    // Handlers for tasks
    const handleViewTask = (id: string) => {
        const task = tasks.find((t) => t.id === id);
        if (task) {
            setSelectedTask(task);
        }
    };

    const handleCompleteTask = async (id: string) => {
        try {
            const response = await fetch(`/work/tasks/${id}/transition`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({ status: 'done' }),
            });

            if (response.ok) {
                setSelectedTask(null);
                router.reload({ only: ['tasks'] });
            }
        } catch (error) {
            console.error('Failed to complete task:', error);
        }
    };

    const handleUpdateTask = async (id: string, status: TodayTask['status']) => {
        const backendStatus = status === 'completed' ? 'done' : status;

        try {
            const response = await fetch(`/work/tasks/${id}/transition`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({ status: backendStatus }),
            });

            if (response.ok) {
                setSelectedTask(null);
                router.reload({ only: ['tasks'] });
            }
        } catch (error) {
            console.error('Failed to update task:', error);
        }
    };

    // Handlers for blockers
    const handleViewBlocker = (id: string) => {
        const blocker = blockers.find((b) => b.id === id);
        if (blocker) {
            setSelectedBlocker(blocker);
        }
    };

    const handleResolveBlocker = (id: string) => {
        // TODO: Implement API call
        console.log('Resolved blocker:', id);
    };

    const handleEscalateBlocker = (id: string) => {
        // TODO: Implement API call
        console.log('Escalated blocker:', id);
    };

    // Handler for work orders
    const handleViewWorkOrder = (id: string) => {
        // Navigate to work order detail page
        window.location.href = `/work/work-orders/${id}`;
    };

    // Handler for activities
    const handleViewActivity = (id: string) => {
        // TODO: Could open a modal or navigate
        console.log('View activity:', id);
    };

    // Handler for quick capture
    const handleQuickCapture = (captureData: QuickCaptureData) => {
        // TODO: Implement API call to create task/request/note
        console.log('Quick capture:', captureData);
    };

    // Handler for refreshing summary
    const handleRefreshSummary = () => {
        router.reload({ only: ['dailySummary'] });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Today" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto p-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Today</h1>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Your command center for what needs attention right now
                        </p>
                    </div>
                </div>

                {/* Main content */}
                <div className="space-y-6">
                    {/* Daily summary - full width at top */}
                    <DailySummaryCard summary={dailySummary} onRefresh={handleRefreshSummary} />

                    {/* Metrics bar - full width */}
                    <MetricsBar metrics={metrics} />

                    {/* Dashboard grid - responsive 2 column layout */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Left column */}
                        <div className="space-y-6">
                            <ApprovalsCard approvals={approvals} onViewApproval={handleViewApproval} />
                            <TasksCard tasks={tasks} onViewTask={handleViewTask} />
                            <BlockersCard blockers={blockers} onViewBlocker={handleViewBlocker} />
                        </div>

                        {/* Right column */}
                        <div className="space-y-6">
                            <UpcomingDeadlinesCard deadlines={upcomingDeadlines} onViewWorkOrder={handleViewWorkOrder} />
                            <ActivityFeed activities={activities} onViewActivity={handleViewActivity} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick capture floating button */}
            <QuickCapture onQuickCapture={handleQuickCapture} />

            {/* Detail sheets */}
            <ApprovalSheet
                approval={selectedApproval}
                onClose={() => setSelectedApproval(null)}
                onApprove={handleApprove}
                onReject={handleReject}
            />
            <TaskSheet
                task={selectedTask}
                onClose={() => setSelectedTask(null)}
                onCompleteTask={handleCompleteTask}
                onUpdateTask={handleUpdateTask}
            />
            <BlockerSheet
                blocker={selectedBlocker}
                onClose={() => setSelectedBlocker(null)}
                onResolveBlocker={handleResolveBlocker}
                onEscalateBlocker={handleEscalateBlocker}
            />
        </AppLayout>
    );
}
