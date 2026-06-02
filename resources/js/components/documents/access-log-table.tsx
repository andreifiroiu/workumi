import { useState, useMemo } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import type { AccessLogTableProps } from '@/types/documents.d';

const ITEMS_PER_PAGE = 10;

export function AccessLogTable({
    accessLogs,
    isLoading = false,
    className,
}: AccessLogTableProps) {
    const [currentPage, setCurrentPage] = useState(1);

    // Sort by most recent first
    const sortedLogs = useMemo(() => {
        return [...accessLogs].sort((a, b) => {
            return new Date(b.accessedAt).getTime() - new Date(a.accessedAt).getTime();
        });
    }, [accessLogs]);

    // Paginate
    const totalPages = Math.ceil(sortedLogs.length / ITEMS_PER_PAGE);
    const paginatedLogs = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return sortedLogs.slice(start, start + ITEMS_PER_PAGE);
    }, [sortedLogs, currentPage]);

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }).format(new Date(dateString));
    };

    const parseUserAgent = (userAgent: string | null): string => {
        if (!userAgent) return 'Unknown';

        // Simple browser detection
        if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
            const match = userAgent.match(/Chrome\/(\d+)/);
            return match ? `Chrome ${match[1]}` : 'Chrome';
        }
        if (userAgent.includes('Firefox')) {
            const match = userAgent.match(/Firefox\/(\d+)/);
            return match ? `Firefox ${match[1]}` : 'Firefox';
        }
        if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
            const match = userAgent.match(/Version\/(\d+)/);
            return match ? `Safari ${match[1]}` : 'Safari';
        }
        if (userAgent.includes('Edg')) {
            const match = userAgent.match(/Edg\/(\d+)/);
            return match ? `Edge ${match[1]}` : 'Edge';
        }
        if (userAgent.includes('MSIE') || userAgent.includes('Trident')) {
            return 'Internet Explorer';
        }

        // Return truncated user agent if no match
        return userAgent.length > 50 ? userAgent.substring(0, 50) + '...' : userAgent;
    };

    if (isLoading) {
        return (
            <div className={cn('flex items-center justify-center py-4', className)}>
                <Spinner className="h-5 w-5" />
            </div>
        );
    }

    if (sortedLogs.length === 0) {
        return (
            <div className={cn('py-4 text-center text-sm text-muted-foreground', className)}>
                <Globe className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2">No access events recorded yet.</p>
            </div>
        );
    }

    return (
        <div className={cn('space-y-2', className)}>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Accessed At</TableHead>
                            <TableHead>IP Address</TableHead>
                            <TableHead>Browser / User Agent</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedLogs.map((log) => (
                            <TableRow key={log.id}>
                                <TableCell className="whitespace-nowrap font-mono text-sm">
                                    {formatDate(log.accessedAt)}
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                    {log.ipAddress || 'Unknown'}
                                </TableCell>
                                <TableCell
                                    className="max-w-xs truncate text-sm"
                                    title={log.userAgent || 'Unknown'}
                                >
                                    {parseUserAgent(log.userAgent)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2">
                    <span className="text-sm text-muted-foreground">
                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                        {Math.min(currentPage * ITEMS_PER_PAGE, sortedLogs.length)} of{' '}
                        {sortedLogs.length} entries
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            aria-label="Previous page"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            aria-label="Next page"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
