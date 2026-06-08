import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    Calendar,
    ChevronDown,
    ChevronRight,
    Download,
    FolderTree,
    Scale,
    Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reports', href: '/reports' },
    { title: 'Time', href: '/reports/time' },
];

interface DailyHours {
    [date: string]: number;
}

interface UserReportData {
    user_id: number;
    user_name: string;
    daily_hours: DailyHours;
    total_hours: number;
}

interface TaskNode {
    id: number;
    name: string;
    type: 'task';
    hours: number;
}

interface WorkOrderNode {
    id: number;
    name: string;
    type: 'work_order';
    hours: number;
    tasks: TaskNode[];
}

interface ProjectNode {
    id: number;
    name: string;
    type: 'project';
    hours: number;
    work_orders: WorkOrderNode[];
}

interface VarianceItem {
    id: number;
    name: string;
    type: 'task' | 'work_order';
    estimated_hours: number;
    actual_hours: number;
    variance: number;
    variance_percent: number;
}

interface TimeReportsFilters {
    date_from: string;
    date_to: string;
}

interface TimeReportsPageProps {
    byUserData: UserReportData[];
    filters: TimeReportsFilters;
}

function formatHours(hours: number): string {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${hours.toFixed(1)}h (${h}:${m.toString().padStart(2, '0')})`;
}

function getDateRange(dateFrom: string, dateTo: string): string[] {
    const dates: string[] = [];
    const current = new Date(dateFrom);
    const end = new Date(dateTo);

    while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }

    return dates;
}

function formatDateHeader(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    }).format(date);
}

function getVarianceColor(variancePercent: number): string {
    if (variancePercent <= -20) return 'text-green-600 dark:text-green-400';
    if (variancePercent <= 0) return 'text-green-500 dark:text-green-500';
    if (variancePercent <= 20) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
}

function getVarianceBgColor(variancePercent: number): string {
    if (variancePercent <= -20) return 'bg-green-100 dark:bg-green-900/20';
    if (variancePercent <= 0) return 'bg-green-50 dark:bg-green-900/10';
    if (variancePercent <= 20) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
}

function ExportButton() {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="opacity-50"
                >
                    <Download className="mr-2 size-4" />
                    Export
                </Button>
            </TooltipTrigger>
            <TooltipContent>Coming soon</TooltipContent>
        </Tooltip>
    );
}

function ByUserTab({
    data,
    dates,
}: {
    data: UserReportData[];
    dates: string[];
}) {
    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
                    <Users className="size-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                    No time entries found
                </h3>
                <p className="text-sm text-muted-foreground">
                    No time has been logged for the selected date range
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="sticky left-0 bg-background">
                            User
                        </TableHead>
                        {dates.map((date) => (
                            <TableHead
                                key={date}
                                className="min-w-[100px] text-center"
                            >
                                {formatDateHeader(date)}
                            </TableHead>
                        ))}
                        <TableHead className="text-right font-bold">
                            Total
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((user) => (
                        <TableRow key={user.user_id}>
                            <TableCell className="sticky left-0 bg-background font-medium">
                                {user.user_name}
                            </TableCell>
                            {dates.map((date) => (
                                <TableCell
                                    key={date}
                                    className="text-center font-mono text-sm"
                                >
                                    {user.daily_hours[date]
                                        ? user.daily_hours[date].toFixed(1)
                                        : '-'}
                                </TableCell>
                            ))}
                            <TableCell className="text-right font-mono font-bold">
                                {formatHours(user.total_hours)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function ProjectTreeItem({
    project,
    level = 0,
}: {
    project: ProjectNode;
    level?: number;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const hasChildren = project.work_orders.length > 0;

    return (
        <div>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <div
                    className={cn(
                        'flex items-center justify-between border-b px-4 py-3 hover:bg-muted/50',
                        level === 0 && 'bg-muted/30 font-medium',
                    )}
                    style={{ paddingLeft: `${level * 24 + 16}px` }}
                >
                    <div className="flex items-center gap-2">
                        {hasChildren ? (
                            <CollapsibleTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="size-6 p-0"
                                >
                                    {isOpen ? (
                                        <ChevronDown className="size-4" />
                                    ) : (
                                        <ChevronRight className="size-4" />
                                    )}
                                </Button>
                            </CollapsibleTrigger>
                        ) : (
                            <span className="size-6" />
                        )}
                        <span>{project.name}</span>
                    </div>
                    <span className="font-mono text-sm">
                        {formatHours(project.hours)}
                    </span>
                </div>
                <CollapsibleContent>
                    {project.work_orders.map((workOrder) => (
                        <WorkOrderTreeItem
                            key={workOrder.id}
                            workOrder={workOrder}
                            level={level + 1}
                        />
                    ))}
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}

function WorkOrderTreeItem({
    workOrder,
    level,
}: {
    workOrder: WorkOrderNode;
    level: number;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const hasChildren = workOrder.tasks.length > 0;

    return (
        <div>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <div
                    className="flex items-center justify-between border-b px-4 py-2 hover:bg-muted/50"
                    style={{ paddingLeft: `${level * 24 + 16}px` }}
                >
                    <div className="flex items-center gap-2">
                        {hasChildren ? (
                            <CollapsibleTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="size-6 p-0"
                                >
                                    {isOpen ? (
                                        <ChevronDown className="size-4" />
                                    ) : (
                                        <ChevronRight className="size-4" />
                                    )}
                                </Button>
                            </CollapsibleTrigger>
                        ) : (
                            <span className="size-6" />
                        )}
                        <span className="text-muted-foreground">
                            {workOrder.name}
                        </span>
                    </div>
                    <span className="font-mono text-sm text-muted-foreground">
                        {formatHours(workOrder.hours)}
                    </span>
                </div>
                <CollapsibleContent>
                    {workOrder.tasks.map((task) => (
                        <div
                            key={task.id}
                            className="flex items-center justify-between border-b px-4 py-2 hover:bg-muted/50"
                            style={{
                                paddingLeft: `${(level + 1) * 24 + 16}px`,
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <span className="size-6" />
                                <span className="text-sm text-muted-foreground">
                                    {task.name}
                                </span>
                            </div>
                            <span className="font-mono text-sm text-muted-foreground">
                                {formatHours(task.hours)}
                            </span>
                        </div>
                    ))}
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}

function ByProjectTab({ data }: { data: ProjectNode[] }) {
    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
                    <FolderTree className="size-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                    No projects found
                </h3>
                <p className="text-sm text-muted-foreground">
                    No time has been logged against any projects
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-border bg-card">
            {data.map((project) => (
                <ProjectTreeItem key={project.id} project={project} />
            ))}
        </div>
    );
}

function ActualVsEstimatedTab({ data }: { data: VarianceItem[] }) {
    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
                    <Scale className="size-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                    No data available
                </h3>
                <p className="text-sm text-muted-foreground">
                    No tasks or work orders have estimated hours set
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Estimated</TableHead>
                        <TableHead className="text-right">Actual</TableHead>
                        <TableHead className="text-right">Variance</TableHead>
                        <TableHead className="text-right">Variance %</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((item) => (
                        <TableRow key={`${item.type}-${item.id}`}>
                            <TableCell className="font-medium">
                                {item.name}
                            </TableCell>
                            <TableCell className="text-muted-foreground capitalize">
                                {item.type.replace('_', ' ')}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                                {formatHours(item.estimated_hours)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                                {formatHours(item.actual_hours)}
                            </TableCell>
                            <TableCell
                                className={cn(
                                    'text-right font-mono',
                                    getVarianceColor(item.variance_percent),
                                )}
                            >
                                {item.variance > 0 ? '+' : ''}
                                {formatHours(item.variance)}
                            </TableCell>
                            <TableCell className="text-right">
                                <span
                                    className={cn(
                                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                                        getVarianceBgColor(
                                            item.variance_percent,
                                        ),
                                        getVarianceColor(item.variance_percent),
                                    )}
                                >
                                    {item.variance_percent > 0 ? '+' : ''}
                                    {item.variance_percent.toFixed(0)}%
                                </span>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export default function TimeReportsIndex({
    byUserData,
    filters,
}: TimeReportsPageProps) {
    const [activeTab, setActiveTab] = useState('by-user');
    const [projectData, setProjectData] = useState<ProjectNode[]>([]);
    const [varianceData, setVarianceData] = useState<VarianceItem[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(false);
    const [isLoadingVariance, setIsLoadingVariance] = useState(false);

    const [localFilters, setLocalFilters] = useState<TimeReportsFilters>({
        date_from: filters.date_from,
        date_to: filters.date_to,
    });

    const dates = getDateRange(filters.date_from, filters.date_to);

    const fetchProjectData = useCallback(async () => {
        setIsLoadingProjects(true);
        try {
            const params = new URLSearchParams();
            if (localFilters.date_from)
                params.set('date_from', localFilters.date_from);
            if (localFilters.date_to)
                params.set('date_to', localFilters.date_to);

            const response = await fetch(
                `/reports/time/by-project?${params.toString()}`,
            );
            const json = await response.json();
            setProjectData(json.data);
        } catch {
            console.error('Failed to fetch project data');
        } finally {
            setIsLoadingProjects(false);
        }
    }, [localFilters]);

    const fetchVarianceData = useCallback(async () => {
        setIsLoadingVariance(true);
        try {
            const response = await fetch('/reports/time/actual-vs-estimated');
            const json = await response.json();
            setVarianceData(json.data);
        } catch {
            console.error('Failed to fetch variance data');
        } finally {
            setIsLoadingVariance(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'by-project' && projectData.length === 0) {
            fetchProjectData();
        } else if (
            activeTab === 'actual-vs-estimated' &&
            varianceData.length === 0
        ) {
            fetchVarianceData();
        }
    }, [
        activeTab,
        projectData.length,
        varianceData.length,
        fetchProjectData,
        fetchVarianceData,
    ]);

    const applyFilters = useCallback(() => {
        const params = new URLSearchParams();
        if (localFilters.date_from)
            params.set('date_from', localFilters.date_from);
        if (localFilters.date_to) params.set('date_to', localFilters.date_to);

        router.get(
            `/reports/time?${params.toString()}`,
            {},
            { preserveState: false },
        );
    }, [localFilters]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Time Reports" />

            <div className="flex h-full flex-1 flex-col">
                {/* Header */}
                <div className="border-b border-sidebar-border/70 px-4 py-4 sm:px-6 sm:py-6 dark:border-sidebar-border">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="mb-2 text-2xl font-bold text-foreground">
                                Time Reports
                            </h1>
                            <p className="text-muted-foreground">
                                Analyze time tracking data across your team
                            </p>
                        </div>
                    </div>
                </div>

                {/* Date Range Filter */}
                <div className="border-b border-sidebar-border/70 bg-muted/30 px-4 py-4 sm:px-6 dark:border-sidebar-border">
                    <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:items-end">
                        <div className="grid gap-2">
                            <Label
                                htmlFor="date_from"
                                className="flex items-center gap-2"
                            >
                                <Calendar className="size-4" />
                                From Date
                            </Label>
                            <Input
                                id="date_from"
                                type="date"
                                value={localFilters.date_from}
                                onChange={(e) =>
                                    setLocalFilters((prev) => ({
                                        ...prev,
                                        date_from: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="date_to">To Date</Label>
                            <Input
                                id="date_to"
                                type="date"
                                value={localFilters.date_to}
                                onChange={(e) =>
                                    setLocalFilters((prev) => ({
                                        ...prev,
                                        date_to: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <Button onClick={applyFilters}>Apply Filters</Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4 sm:p-6">
                    <Tabs
                        value={activeTab}
                        onValueChange={setActiveTab}
                        className="space-y-6"
                    >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            {/* Mobile: dropdown */}
                            <Select
                                value={activeTab}
                                onValueChange={setActiveTab}
                            >
                                <SelectTrigger className="w-full sm:hidden">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="by-user">
                                        By User
                                    </SelectItem>
                                    <SelectItem value="by-project">
                                        By Project
                                    </SelectItem>
                                    <SelectItem value="actual-vs-estimated">
                                        Actual vs Estimated
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            {/* Desktop: tabs */}
                            <TabsList className="hidden sm:inline-flex">
                                <TabsTrigger value="by-user" className="gap-2">
                                    <Users className="size-4" />
                                    By User
                                </TabsTrigger>
                                <TabsTrigger
                                    value="by-project"
                                    className="gap-2"
                                >
                                    <FolderTree className="size-4" />
                                    By Project
                                </TabsTrigger>
                                <TabsTrigger
                                    value="actual-vs-estimated"
                                    className="gap-2"
                                >
                                    <Scale className="size-4" />
                                    Actual vs Estimated
                                </TabsTrigger>
                            </TabsList>
                            <ExportButton />
                        </div>

                        <TabsContent value="by-user" className="mt-6">
                            <div className="rounded-lg border border-border bg-card">
                                <ByUserTab data={byUserData} dates={dates} />
                            </div>
                        </TabsContent>

                        <TabsContent value="by-project" className="mt-6">
                            {isLoadingProjects ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-pulse text-muted-foreground">
                                        Loading project data...
                                    </div>
                                </div>
                            ) : (
                                <ByProjectTab data={projectData} />
                            )}
                        </TabsContent>

                        <TabsContent
                            value="actual-vs-estimated"
                            className="mt-6"
                        >
                            {isLoadingVariance ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-pulse text-muted-foreground">
                                        Loading variance data...
                                    </div>
                                </div>
                            ) : (
                                <ActualVsEstimatedTab data={varianceData} />
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </AppLayout>
    );
}
