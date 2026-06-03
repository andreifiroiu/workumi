import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import type { BreadcrumbItem } from '@/types';

interface AgentSummary {
    id: number;
    code: string;
    name: string;
}

interface ActivityLog {
    id: number;
    run_type: string;
    input: string | null;
    output: string | null;
    tokens_used: number | null;
    cost: number | null;
    approval_status: string | null;
    approval_status_label: string | null;
    tool_call_count: number;
    duration_ms: number | null;
    created_at: string | null;
}

interface PaginatedActivities {
    data: ActivityLog[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    meta?: { total: number };
}

interface AgentActivityIndexProps {
    agent: AgentSummary;
    activities: PaginatedActivities;
}

const approvalBadgeVariant = (status: string | null) => {
    switch (status) {
        case 'approved': return 'default' as const;
        case 'rejected': return 'destructive' as const;
        case 'pending': return 'secondary' as const;
        default: return 'outline' as const;
    }
};

export default function AgentActivityIndex({ agent, activities }: AgentActivityIndexProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Settings', href: '/settings' },
        { title: 'AI Agents', href: '/settings?tab=ai-agents' },
        { title: `${agent.name} Activity`, href: `/settings/agents/${agent.id}/activity` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${agent.name} Activity`} />

            <div className="flex h-full flex-col gap-4 p-4">
                <h1 className="text-2xl font-semibold">{agent.name} Activity</h1>

                <Card>
                    <CardHeader>
                        <CardTitle>Activity Log</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Runs, tool calls, and approvals for this agent.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Run Type</TableHead>
                                    <TableHead>Input</TableHead>
                                    <TableHead>Tools</TableHead>
                                    <TableHead>Tokens</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activities.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                                            No activity recorded yet
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    activities.data.map((activity) => (
                                        <TableRow key={activity.id}>
                                            <TableCell className="font-mono text-xs">
                                                {activity.created_at
                                                    ? new Date(activity.created_at).toLocaleString()
                                                    : '—'}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {activity.run_type}
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate">
                                                <Link
                                                    href={`/settings/agent-activity/${activity.id}`}
                                                    className="hover:underline"
                                                >
                                                    {activity.input}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{activity.tool_call_count}</TableCell>
                                            <TableCell>{activity.tokens_used ?? 0}</TableCell>
                                            <TableCell>
                                                {activity.approval_status && (
                                                    <Badge variant={approvalBadgeVariant(activity.approval_status)}>
                                                        {activity.approval_status_label ?? activity.approval_status}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
