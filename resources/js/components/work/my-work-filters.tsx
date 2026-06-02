import { ArrowUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
    MyWorkFiltersState,
    MyWorkSubtab,
    RaciRole,
    DueDateRange,
    SortBy,
} from '@/types/work';

interface MyWorkFiltersProps {
    filters: MyWorkFiltersState;
    showInformed: boolean;
    activeSubtab: MyWorkSubtab;
    onFiltersChange: (filters: MyWorkFiltersState) => void;
    onShowInformedChange: (show: boolean) => void;
    className?: string;
}

const raciRoleOptions: Array<{ value: RaciRole; label: string }> = [
    { value: 'accountable', label: 'Accountable' },
    { value: 'responsible', label: 'Responsible' },
    { value: 'consulted', label: 'Consulted' },
    { value: 'informed', label: 'Informed' },
];

const dueDateRangeOptions: Array<{ value: DueDateRange; label: string }> = [
    { value: 'this_week', label: 'This week' },
    { value: 'next_7_days', label: 'Next 7 days' },
    { value: 'next_30_days', label: 'Next 30 days' },
    { value: 'overdue', label: 'Overdue' },
];

const sortByOptions: Array<{ value: SortBy; label: string }> = [
    { value: 'due_date', label: 'Due date' },
    { value: 'priority', label: 'Priority' },
    { value: 'recently_updated', label: 'Recently updated' },
    { value: 'alphabetical', label: 'Alphabetical' },
];

// Status options based on active subtab
const statusOptionsBySubtab: Record<MyWorkSubtab, Array<{ value: string; label: string }>> = {
    tasks: [
        { value: 'todo', label: 'To Do' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'done', label: 'Done' },
    ],
    work_orders: [
        { value: 'draft', label: 'Draft' },
        { value: 'active', label: 'Active' },
        { value: 'in_review', label: 'In Review' },
        { value: 'approved', label: 'Approved' },
        { value: 'delivered', label: 'Delivered' },
    ],
    projects: [
        { value: 'active', label: 'Active' },
        { value: 'on_hold', label: 'On Hold' },
        { value: 'completed', label: 'Completed' },
    ],
    all: [
        { value: 'active', label: 'Active' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'todo', label: 'To Do' },
    ],
};

export function MyWorkFilters({
    filters,
    showInformed,
    activeSubtab,
    onFiltersChange,
    onShowInformedChange,
    className,
}: MyWorkFiltersProps) {
    const statusOptions = statusOptionsBySubtab[activeSubtab];
    const showRaciFilters = activeSubtab !== 'tasks';

    const hasActiveFilters =
        filters.raciRoles.length > 0 ||
        filters.statuses.length > 0 ||
        filters.dueDateRange !== null;

    const handleRaciRoleToggle = (role: RaciRole) => {
        const newRoles = filters.raciRoles.includes(role)
            ? filters.raciRoles.filter((r) => r !== role)
            : [...filters.raciRoles, role];
        onFiltersChange({ ...filters, raciRoles: newRoles });
    };

    const handleStatusToggle = (status: string) => {
        const newStatuses = filters.statuses.includes(status)
            ? filters.statuses.filter((s) => s !== status)
            : [...filters.statuses, status];
        onFiltersChange({ ...filters, statuses: newStatuses });
    };

    const handleDueDateRangeChange = (value: string) => {
        onFiltersChange({
            ...filters,
            dueDateRange: value === 'all' ? null : (value as DueDateRange),
        });
    };

    const handleSortByChange = (value: SortBy) => {
        onFiltersChange({ ...filters, sortBy: value });
    };

    const handleSortDirectionToggle = () => {
        onFiltersChange({
            ...filters,
            sortDirection: filters.sortDirection === 'asc' ? 'desc' : 'asc',
        });
    };

    const handleClearAll = () => {
        onFiltersChange({
            raciRoles: [],
            statuses: [],
            dueDateRange: null,
            sortBy: 'due_date',
            sortDirection: 'asc',
        });
    };

    return (
        <div className={cn('flex flex-wrap items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 bg-muted/30 border-b border-border', className)}>
            {/* RACI Role Filter (not shown for Tasks subtab) */}
            {showRaciFilters && (
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-xs font-medium text-muted-foreground hidden sm:inline">Role:</span>
                    <div className="flex gap-1" role="group" aria-label="Filter by RACI role">
                        {raciRoleOptions.map((option) => (
                            <Button
                                key={option.value}
                                variant={filters.raciRoles.includes(option.value) ? 'default' : 'outline'}
                                size="sm"
                                className="h-7 w-7 sm:w-auto sm:px-2 p-0 text-xs"
                                onClick={() => handleRaciRoleToggle(option.value)}
                                aria-pressed={filters.raciRoles.includes(option.value)}
                                aria-label={`Filter by ${option.label}`}
                            >
                                {option.label.charAt(0)}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xs font-medium text-muted-foreground hidden sm:inline">Status:</span>
                <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by status">
                    {statusOptions.map((option) => (
                        <Badge
                            key={option.value}
                            variant={filters.statuses.includes(option.value) ? 'default' : 'outline'}
                            className="cursor-pointer text-xs"
                            onClick={() => handleStatusToggle(option.value)}
                            aria-pressed={filters.statuses.includes(option.value)}
                        >
                            {option.label}
                        </Badge>
                    ))}
                </div>
            </div>

            {/* Due Date Range Filter */}
            <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xs font-medium text-muted-foreground hidden sm:inline">Due:</span>
                <Select
                    value={filters.dueDateRange ?? 'all'}
                    onValueChange={handleDueDateRangeChange}
                >
                    <SelectTrigger
                        className="h-7 w-[100px] sm:w-[130px] text-xs"
                        aria-label="Filter by due date"
                    >
                        <SelectValue placeholder="Any time" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Any time</SelectItem>
                        {dueDateRangeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Sort Controls - move to new row on mobile via order */}
            <div className="flex items-center gap-1.5 sm:gap-2 ml-auto order-last sm:order-none w-full sm:w-auto justify-end sm:justify-start pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50 mt-2 sm:mt-0">
                <span className="text-xs font-medium text-muted-foreground hidden sm:inline">Sort:</span>
                <Select value={filters.sortBy} onValueChange={(v) => handleSortByChange(v as SortBy)}>
                    <SelectTrigger
                        className="h-7 w-[110px] sm:w-[140px] text-xs"
                        aria-label="Sort by"
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {sortByOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={handleSortDirectionToggle}
                    aria-label={`Sort ${filters.sortDirection === 'asc' ? 'ascending' : 'descending'}`}
                >
                    <ArrowUpDown
                        className={cn(
                            'h-4 w-4 transition-transform',
                            filters.sortDirection === 'desc' && 'rotate-180'
                        )}
                        aria-hidden="true"
                    />
                </Button>
            </div>

            {/* Show Informed Toggle (not shown for Tasks subtab) */}
            {showRaciFilters && (
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <label
                        htmlFor="show-informed-toggle"
                        className="text-xs font-medium text-muted-foreground cursor-pointer whitespace-nowrap"
                    >
                        <span className="hidden sm:inline">Show </span>Informed
                    </label>
                    <Switch
                        id="show-informed-toggle"
                        checked={showInformed}
                        onCheckedChange={onShowInformedChange}
                    />
                </div>
            )}

            {/* Clear All Button */}
            {hasActiveFilters && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={handleClearAll}
                >
                    <X className="h-3 w-3 mr-1" aria-hidden="true" />
                    <span className="hidden sm:inline">Clear all</span>
                    <span className="sm:hidden">Clear</span>
                </Button>
            )}
        </div>
    );
}

// Default empty filter state helper
export function getDefaultFilters(): MyWorkFiltersState {
    return {
        raciRoles: [],
        statuses: [],
        dueDateRange: null,
        sortBy: 'due_date',
        sortDirection: 'asc',
    };
}
