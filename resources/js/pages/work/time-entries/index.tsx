import { useState, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import { Pencil, Trash2, Clock, Calendar, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { TimeEntryForm } from '@/components/time-tracking/time-entry-form';
import type { BreadcrumbItem } from '@/types';
import type { TimeEntry, TimeEntriesPageProps, TimeEntriesFilters } from '@/types/work';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Work', href: '/work' },
    { title: 'Time Entries', href: '/work/time-entries' },
];

/**
 * Formats decimal hours to dual format: "1.5h (1:30)"
 */
function formatHours(hours: number): string {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${hours.toFixed(2)}h (${h}:${m.toString().padStart(2, '0')})`;
}

/**
 * Formats a date string to a readable format
 */
function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(date);
}

export default function TimeEntriesIndex({ entries, filters }: TimeEntriesPageProps) {
    const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
    const [deleteEntry, setDeleteEntry] = useState<TimeEntry | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const [localFilters, setLocalFilters] = useState<TimeEntriesFilters>({
        date_from: filters.date_from || null,
        date_to: filters.date_to || null,
        task_id: filters.task_id || null,
        billable: filters.billable || null,
    });

    const hasActiveFilters =
        filters.date_from || filters.date_to || filters.task_id || filters.billable !== null;

    const applyFilters = useCallback(() => {
        const params = new URLSearchParams();

        if (localFilters.date_from) {
            params.set('date_from', localFilters.date_from);
        }
        if (localFilters.date_to) {
            params.set('date_to', localFilters.date_to);
        }
        if (localFilters.task_id) {
            params.set('task_id', localFilters.task_id);
        }
        if (localFilters.billable !== null && localFilters.billable !== '') {
            params.set('billable', localFilters.billable);
        }

        router.get(`/work/time-entries?${params.toString()}`, {}, { preserveState: true });
    }, [localFilters]);

    const clearFilters = useCallback(() => {
        setLocalFilters({
            date_from: null,
            date_to: null,
            task_id: null,
            billable: null,
        });
        router.get('/work/time-entries', {}, { preserveState: true });
    }, []);

    const handleDelete = useCallback(() => {
        if (!deleteEntry) return;

        setIsDeleting(true);
        router.delete(`/work/time-entries/${deleteEntry.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeleteEntry(null);
            },
            onFinish: () => {
                setIsDeleting(false);
            },
        });
    }, [deleteEntry]);

    const handlePageChange = useCallback((url: string | null) => {
        if (!url) return;
        router.get(url, {}, { preserveState: true, preserveScroll: true });
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Time Entries" />

            <div className="flex h-full flex-1 flex-col">
                {/* Header */}
                <div className="border-b border-sidebar-border/70 px-6 py-6 dark:border-sidebar-border">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="mb-2 text-2xl font-bold text-foreground">Time Entries</h1>
                            <p className="text-muted-foreground">
                                View and manage your logged work hours
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setShowFilters(!showFilters)}
                            className={hasActiveFilters ? 'border-indigo-500' : ''}
                        >
                            <Filter className="size-4" />
                            <span>Filters</span>
                            {hasActiveFilters && (
                                <Badge variant="secondary" className="ml-1">
                                    Active
                                </Badge>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="border-b border-sidebar-border/70 bg-muted/30 px-6 py-4 dark:border-sidebar-border">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="grid gap-2">
                                <Label htmlFor="date_from">From Date</Label>
                                <Input
                                    id="date_from"
                                    type="date"
                                    value={localFilters.date_from || ''}
                                    onChange={(e) =>
                                        setLocalFilters((prev) => ({
                                            ...prev,
                                            date_from: e.target.value || null,
                                        }))
                                    }
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="date_to">To Date</Label>
                                <Input
                                    id="date_to"
                                    type="date"
                                    value={localFilters.date_to || ''}
                                    onChange={(e) =>
                                        setLocalFilters((prev) => ({
                                            ...prev,
                                            date_to: e.target.value || null,
                                        }))
                                    }
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="billable_filter">Billable Status</Label>
                                <Select
                                    value={localFilters.billable || 'all'}
                                    onValueChange={(value) =>
                                        setLocalFilters((prev) => ({
                                            ...prev,
                                            billable: value === 'all' ? null : value,
                                        }))
                                    }
                                >
                                    <SelectTrigger id="billable_filter">
                                        <SelectValue placeholder="All entries" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All entries</SelectItem>
                                        <SelectItem value="1">Billable only</SelectItem>
                                        <SelectItem value="0">Non-billable only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-end gap-2">
                                <Button onClick={applyFilters} className="flex-1">
                                    Apply Filters
                                </Button>
                                {hasActiveFilters && (
                                    <Button variant="outline" onClick={clearFilters}>
                                        <X className="size-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    {entries.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
                                <Clock className="size-8 text-muted-foreground" />
                            </div>
                            <h3 className="mb-2 text-lg font-semibold text-foreground">
                                No time entries found
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {hasActiveFilters
                                    ? 'Try adjusting your filters to see more entries'
                                    : 'Start logging time on your tasks to see entries here'}
                            </p>
                            {hasActiveFilters && (
                                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                                    Clear Filters
                                </Button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="rounded-lg border border-border bg-card">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Task</TableHead>
                                            <TableHead>Project</TableHead>
                                            <TableHead>Hours</TableHead>
                                            <TableHead>Mode</TableHead>
                                            <TableHead>Billable</TableHead>
                                            <TableHead className="max-w-[200px]">Note</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {entries.data.map((entry) => (
                                            <TableRow key={entry.id}>
                                                <TableCell className="whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="size-4 text-muted-foreground" />
                                                        {formatDate(entry.date)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-medium">
                                                        {entry.task?.title || 'Unknown Task'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {entry.task?.work_order?.project?.name || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-mono text-sm">
                                                        {formatHours(Number(entry.hours))}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            entry.mode === 'timer'
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                    >
                                                        {entry.mode === 'timer'
                                                            ? 'Timer'
                                                            : entry.mode === 'manual'
                                                              ? 'Manual'
                                                              : 'AI'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            entry.is_billable
                                                                ? 'success'
                                                                : 'outline'
                                                        }
                                                    >
                                                        {entry.is_billable
                                                            ? 'Billable'
                                                            : 'Non-billable'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="max-w-[200px] truncate text-muted-foreground">
                                                    {entry.note || '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setEditEntry(entry)}
                                                            aria-label={`Edit time entry for ${entry.task?.title || 'task'}`}
                                                        >
                                                            <Pencil className="size-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setDeleteEntry(entry)}
                                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                            aria-label={`Delete time entry for ${entry.task?.title || 'task'}`}
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {entries.last_page > 1 && (
                                <div className="mt-6 flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">
                                        Showing {entries.from} to {entries.to} of {entries.total}{' '}
                                        entries
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={!entries.prev_page_url}
                                            onClick={() => handlePageChange(entries.prev_page_url)}
                                            aria-label="Previous page"
                                        >
                                            <ChevronLeft className="size-4" />
                                            <span className="sr-only sm:not-sr-only sm:ml-1">
                                                Previous
                                            </span>
                                        </Button>
                                        <span className="text-sm text-muted-foreground">
                                            Page {entries.current_page} of {entries.last_page}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={!entries.next_page_url}
                                            onClick={() => handlePageChange(entries.next_page_url)}
                                            aria-label="Next page"
                                        >
                                            <span className="sr-only sm:not-sr-only sm:mr-1">
                                                Next
                                            </span>
                                            <ChevronRight className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Edit Sheet */}
            <Sheet open={!!editEntry} onOpenChange={(open) => !open && setEditEntry(null)}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Edit Time Entry</SheetTitle>
                        <SheetDescription>
                            Update the details of this time entry. Click save when you're done.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6">
                        {editEntry && (
                            <>
                                <div className="mb-4 rounded-md bg-muted/50 p-3">
                                    <p className="text-sm font-medium">
                                        {editEntry.task?.title || 'Unknown Task'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {editEntry.task?.work_order?.project?.name || 'Unknown Project'}
                                    </p>
                                </div>
                                <TimeEntryForm
                                    entry={editEntry}
                                    onSuccess={() => setEditEntry(null)}
                                />
                            </>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteEntry} onOpenChange={(open) => !open && setDeleteEntry(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Time Entry</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this time entry? This action cannot be
                            undone.
                        </DialogDescription>
                    </DialogHeader>
                    {deleteEntry && (
                        <div className="rounded-md bg-muted/50 p-4">
                            <div className="flex justify-between">
                                <div>
                                    <p className="font-medium">
                                        {deleteEntry.task?.title || 'Unknown Task'}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {formatDate(deleteEntry.date)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono font-medium">
                                        {formatHours(Number(deleteEntry.hours))}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {deleteEntry.is_billable ? 'Billable' : 'Non-billable'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteEntry(null)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete Entry'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
