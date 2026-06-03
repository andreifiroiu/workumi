import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import type { BreadcrumbItem } from '@/types';

interface AgentTemplate {
    id: number;
    code: string;
    name: string;
    type: string | null;
    type_label: string | null;
    description: string | null;
    default_tools: string[];
    default_permissions: string[];
    is_active: boolean;
    agents_count?: number;
}

interface AgentTemplatesIndexProps {
    templates: AgentTemplate[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings' },
    { title: 'Agent Templates', href: '/settings/agent-templates' },
];

export default function AgentTemplatesIndex({ templates }: AgentTemplatesIndexProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Agent Templates" />

            <div className="flex h-full flex-col gap-4 p-4">
                <h1 className="text-2xl font-semibold">Agent Templates</h1>

                <Card>
                    <CardHeader>
                        <CardTitle>Available Templates</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Start from a template to create a new AI agent.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Agents</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {templates.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                                            No templates available yet
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    templates.map((template) => (
                                        <TableRow key={template.id}>
                                            <TableCell>
                                                <Link
                                                    href={`/settings/agent-templates/${template.id}`}
                                                    className="font-medium hover:underline"
                                                >
                                                    {template.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                {template.type_label && (
                                                    <Badge variant="secondary">{template.type_label}</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="max-w-md truncate text-muted-foreground">
                                                {template.description}
                                            </TableCell>
                                            <TableCell>{template.agents_count ?? 0}</TableCell>
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
