import {
    ProfitabilitySummaryCards,
    type ProfitabilitySummary,
} from '@/components/reports/profitability-summary-cards';
import {
    ProfitabilityTable,
    type ProfitabilityRow,
} from '@/components/reports/profitability-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    Briefcase,
    Building2,
    Calendar,
    Download,
    FolderTree,
    Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reports', href: '/reports' },
    { title: 'Profitability', href: '/reports/profitability' },
];

interface ProfitabilityFilters {
    date_from: string;
    date_to: string;
}

interface ProfitabilityReportsPageProps {
    filters: ProfitabilityFilters;
}

interface ApiProfitabilityItem {
    id: number | string;
    name: string;
    budget_cost?: number;
    actual_cost?: number;
    revenue?: number;
    margin?: number;
    margin_percent?: number;
    utilization?: number;
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

interface EmptyStateProps {
    icon: React.ElementType;
    title: string;
    description: string;
}

function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
                <Icon
                    className="size-8 text-muted-foreground"
                    aria-hidden="true"
                />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">
                {title}
            </h3>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
    );
}

function calculateSummaryFromData(
    data: ProfitabilityRow[],
): ProfitabilitySummary {
    if (data.length === 0) {
        return {
            totalBudget: 0,
            totalActualCost: 0,
            totalRevenue: 0,
            totalMargin: 0,
            avgMarginPercent: 0,
        };
    }

    const totalBudget = data.reduce((sum, item) => sum + item.budget, 0);
    const totalActualCost = data.reduce(
        (sum, item) => sum + item.actualCost,
        0,
    );
    const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
    const totalMargin = totalRevenue - totalActualCost;
    const avgMarginPercent =
        totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

    return {
        totalBudget,
        totalActualCost,
        totalRevenue,
        totalMargin,
        avgMarginPercent,
    };
}

interface TabContentProps {
    data: ProfitabilityRow[];
    isLoading: boolean;
    emptyIcon: React.ElementType;
    emptyTitle: string;
    emptyDescription: string;
    showUtilization?: boolean;
    onRowClick?: (row: ProfitabilityRow) => void;
}

function TabContent({
    data,
    isLoading,
    emptyIcon,
    emptyTitle,
    emptyDescription,
    showUtilization = false,
    onRowClick,
}: TabContentProps) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-pulse text-muted-foreground">
                    Loading data...
                </div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <EmptyState
                icon={emptyIcon}
                title={emptyTitle}
                description={emptyDescription}
            />
        );
    }

    const summary = calculateSummaryFromData(data);

    return (
        <div className="space-y-6">
            <ProfitabilitySummaryCards summary={summary} />
            <div className="rounded-lg border border-border bg-card">
                <ProfitabilityTable
                    data={data}
                    showUtilization={showUtilization}
                    onRowClick={onRowClick}
                />
            </div>
        </div>
    );
}

function transformApiResponse(
    apiData: ApiProfitabilityItem[],
): ProfitabilityRow[] {
    return (apiData || []).map((item) => ({
        id: item.id,
        name: item.name,
        budget: Number(item.budget_cost) || 0,
        actualCost: Number(item.actual_cost) || 0,
        revenue: Number(item.revenue) || 0,
        margin: Number(item.margin) || 0,
        marginPercent: Number(item.margin_percent) || 0,
        utilization:
            item.utilization !== undefined
                ? Number(item.utilization)
                : undefined,
    }));
}

export default function ProfitabilityReportsIndex({
    filters,
}: ProfitabilityReportsPageProps) {
    const [activeTab, setActiveTab] = useState('by-project');
    const [projectData, setProjectData] = useState<ProfitabilityRow[]>([]);
    const [workOrderData, setWorkOrderData] = useState<ProfitabilityRow[]>([]);
    const [teamMemberData, setTeamMemberData] = useState<ProfitabilityRow[]>(
        [],
    );
    const [clientData, setClientData] = useState<ProfitabilityRow[]>([]);

    const [isLoadingProject, setIsLoadingProject] = useState(false);
    const [isLoadingWorkOrder, setIsLoadingWorkOrder] = useState(false);
    const [isLoadingTeamMember, setIsLoadingTeamMember] = useState(false);
    const [isLoadingClient, setIsLoadingClient] = useState(false);

    const [localFilters, setLocalFilters] = useState<ProfitabilityFilters>({
        date_from: filters.date_from,
        date_to: filters.date_to,
    });

    const buildQueryString = useCallback(() => {
        const params = new URLSearchParams();
        if (localFilters.date_from)
            params.set('date_from', localFilters.date_from);
        if (localFilters.date_to) params.set('date_to', localFilters.date_to);
        return params.toString();
    }, [localFilters]);

    const fetchProjectData = useCallback(async () => {
        setIsLoadingProject(true);
        try {
            const response = await fetch(
                `/reports/profitability/by-project?${buildQueryString()}`,
            );
            const json = await response.json();
            setProjectData(transformApiResponse(json.data));
        } catch {
            console.error('Failed to fetch project data');
        } finally {
            setIsLoadingProject(false);
        }
    }, [buildQueryString]);

    const fetchWorkOrderData = useCallback(async () => {
        setIsLoadingWorkOrder(true);
        try {
            const response = await fetch(
                `/reports/profitability/by-work-order?${buildQueryString()}`,
            );
            const json = await response.json();
            setWorkOrderData(transformApiResponse(json.data));
        } catch {
            console.error('Failed to fetch work order data');
        } finally {
            setIsLoadingWorkOrder(false);
        }
    }, [buildQueryString]);

    const fetchTeamMemberData = useCallback(async () => {
        setIsLoadingTeamMember(true);
        try {
            const response = await fetch(
                `/reports/profitability/by-team-member?${buildQueryString()}`,
            );
            const json = await response.json();
            setTeamMemberData(transformApiResponse(json.data));
        } catch {
            console.error('Failed to fetch team member data');
        } finally {
            setIsLoadingTeamMember(false);
        }
    }, [buildQueryString]);

    const fetchClientData = useCallback(async () => {
        setIsLoadingClient(true);
        try {
            const response = await fetch(
                `/reports/profitability/by-client?${buildQueryString()}`,
            );
            const json = await response.json();
            setClientData(transformApiResponse(json.data));
        } catch {
            console.error('Failed to fetch client data');
        } finally {
            setIsLoadingClient(false);
        }
    }, [buildQueryString]);

    useEffect(() => {
        if (
            activeTab === 'by-project' &&
            projectData.length === 0 &&
            !isLoadingProject
        ) {
            fetchProjectData();
        } else if (
            activeTab === 'by-work-order' &&
            workOrderData.length === 0 &&
            !isLoadingWorkOrder
        ) {
            fetchWorkOrderData();
        } else if (
            activeTab === 'by-team-member' &&
            teamMemberData.length === 0 &&
            !isLoadingTeamMember
        ) {
            fetchTeamMemberData();
        } else if (
            activeTab === 'by-client' &&
            clientData.length === 0 &&
            !isLoadingClient
        ) {
            fetchClientData();
        }
    }, [
        activeTab,
        projectData.length,
        workOrderData.length,
        teamMemberData.length,
        clientData.length,
        isLoadingProject,
        isLoadingWorkOrder,
        isLoadingTeamMember,
        isLoadingClient,
        fetchProjectData,
        fetchWorkOrderData,
        fetchTeamMemberData,
        fetchClientData,
    ]);

    const applyFilters = useCallback(() => {
        const params = new URLSearchParams();
        if (localFilters.date_from)
            params.set('date_from', localFilters.date_from);
        if (localFilters.date_to) params.set('date_to', localFilters.date_to);

        // Clear cached data to force refetch with new filters
        setProjectData([]);
        setWorkOrderData([]);
        setTeamMemberData([]);
        setClientData([]);

        router.get(
            `/reports/profitability?${params.toString()}`,
            {},
            { preserveState: false },
        );
    }, [localFilters]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profitability Reports" />

            <div className="flex h-full flex-1 flex-col">
                {/* Header */}
                <div className="border-b border-sidebar-border/70 px-4 py-4 sm:px-6 sm:py-6 dark:border-sidebar-border">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="mb-2 text-2xl font-bold text-foreground">
                                Profitability Reports
                            </h1>
                            <p className="text-muted-foreground">
                                Analyze profitability across projects, work
                                orders, team members, and clients
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
                                <Calendar
                                    className="size-4"
                                    aria-hidden="true"
                                />
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
                                    <SelectItem value="by-project">
                                        By Project
                                    </SelectItem>
                                    <SelectItem value="by-work-order">
                                        By Work Order
                                    </SelectItem>
                                    <SelectItem value="by-team-member">
                                        By Team Member
                                    </SelectItem>
                                    <SelectItem value="by-client">
                                        By Client
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            {/* Desktop: tabs */}
                            <TabsList className="hidden sm:inline-flex">
                                <TabsTrigger
                                    value="by-project"
                                    className="gap-2"
                                >
                                    <FolderTree
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    By Project
                                </TabsTrigger>
                                <TabsTrigger
                                    value="by-work-order"
                                    className="gap-2"
                                >
                                    <Briefcase
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    By Work Order
                                </TabsTrigger>
                                <TabsTrigger
                                    value="by-team-member"
                                    className="gap-2"
                                >
                                    <Users
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    By Team Member
                                </TabsTrigger>
                                <TabsTrigger
                                    value="by-client"
                                    className="gap-2"
                                >
                                    <Building2
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    By Client
                                </TabsTrigger>
                            </TabsList>
                            <ExportButton />
                        </div>

                        <TabsContent value="by-project" className="mt-6">
                            <TabContent
                                data={projectData}
                                isLoading={isLoadingProject}
                                emptyIcon={FolderTree}
                                emptyTitle="No project data found"
                                emptyDescription="No profitability data available for projects in the selected date range"
                            />
                        </TabsContent>

                        <TabsContent value="by-work-order" className="mt-6">
                            <TabContent
                                data={workOrderData}
                                isLoading={isLoadingWorkOrder}
                                emptyIcon={Briefcase}
                                emptyTitle="No work order data found"
                                emptyDescription="No profitability data available for work orders in the selected date range"
                            />
                        </TabsContent>

                        <TabsContent value="by-team-member" className="mt-6">
                            <TabContent
                                data={teamMemberData}
                                isLoading={isLoadingTeamMember}
                                emptyIcon={Users}
                                emptyTitle="No team member data found"
                                emptyDescription="No profitability data available for team members in the selected date range"
                                showUtilization
                            />
                        </TabsContent>

                        <TabsContent value="by-client" className="mt-6">
                            <TabContent
                                data={clientData}
                                isLoading={isLoadingClient}
                                emptyIcon={Building2}
                                emptyTitle="No client data found"
                                emptyDescription="No profitability data available for clients in the selected date range"
                            />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </AppLayout>
    );
}
