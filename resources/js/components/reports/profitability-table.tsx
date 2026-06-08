import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useIsMobile } from '@/hooks/use-mobile';
import {
    formatCurrency,
    formatPercent,
    getMarginBgColor,
    getMarginColor,
} from '@/lib/profitability-utils';
import { cn } from '@/lib/utils';

export interface ProfitabilityRow {
    id: number | string;
    name: string;
    budget: number;
    actualCost: number;
    revenue: number;
    margin: number;
    marginPercent: number;
    utilization?: number;
}

interface ProfitabilityTableProps {
    data: ProfitabilityRow[];
    showUtilization?: boolean;
    onRowClick?: (row: ProfitabilityRow) => void;
    emptyMessage?: string;
}

export function ProfitabilityTable({
    data,
    showUtilization = false,
    onRowClick,
    emptyMessage = 'No data available',
}: ProfitabilityTableProps) {
    const isMobile = useIsMobile();

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">{emptyMessage}</p>
            </div>
        );
    }

    // Mobile: stacked cards instead of a wide horizontally-scrolling table
    if (isMobile) {
        return (
            <div className="divide-y divide-border">
                {data.map((row) => (
                    <button
                        key={row.id}
                        type="button"
                        onClick={() => onRowClick?.(row)}
                        disabled={!onRowClick}
                        className={cn(
                            'block w-full p-4 text-left',
                            onRowClick && 'hover:bg-muted/50',
                        )}
                    >
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <span className="font-medium text-foreground">
                                {row.name}
                            </span>
                            <span
                                className={cn(
                                    'inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                                    getMarginBgColor(row.marginPercent),
                                    getMarginColor(row.marginPercent),
                                )}
                            >
                                {formatPercent(row.marginPercent)}
                            </span>
                        </div>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <div className="flex justify-between gap-2">
                                <dt className="text-muted-foreground">
                                    Budget
                                </dt>
                                <dd className="font-mono">
                                    {formatCurrency(row.budget)}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                                <dt className="text-muted-foreground">
                                    Actual
                                </dt>
                                <dd className="font-mono">
                                    {formatCurrency(row.actualCost)}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                                <dt className="text-muted-foreground">
                                    Revenue
                                </dt>
                                <dd className="font-mono">
                                    {formatCurrency(row.revenue)}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                                <dt className="text-muted-foreground">
                                    Margin
                                </dt>
                                <dd
                                    className={cn(
                                        'font-mono',
                                        getMarginColor(row.marginPercent),
                                    )}
                                >
                                    {formatCurrency(row.margin)}
                                </dd>
                            </div>
                            {showUtilization && (
                                <div className="flex justify-between gap-2">
                                    <dt className="text-muted-foreground">
                                        Utilization
                                    </dt>
                                    <dd className="font-mono">
                                        {row.utilization !== undefined
                                            ? formatPercent(row.utilization)
                                            : '-'}
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </button>
                ))}
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Actual Cost</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">Margin %</TableHead>
                    {showUtilization && (
                        <TableHead className="text-right">
                            Utilization
                        </TableHead>
                    )}
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((row) => (
                    <TableRow
                        key={row.id}
                        onClick={() => onRowClick?.(row)}
                        className={cn(onRowClick && 'cursor-pointer')}
                    >
                        <TableCell className="font-medium">
                            {row.name}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                            {formatCurrency(row.budget)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                            {formatCurrency(row.actualCost)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                            {formatCurrency(row.revenue)}
                        </TableCell>
                        <TableCell
                            className={cn(
                                'text-right font-mono',
                                getMarginColor(row.marginPercent),
                            )}
                        >
                            {formatCurrency(row.margin)}
                        </TableCell>
                        <TableCell className="text-right">
                            <span
                                className={cn(
                                    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                                    getMarginBgColor(row.marginPercent),
                                    getMarginColor(row.marginPercent),
                                )}
                            >
                                {formatPercent(row.marginPercent)}
                            </span>
                        </TableCell>
                        {showUtilization && (
                            <TableCell className="text-right font-mono">
                                {row.utilization !== undefined
                                    ? formatPercent(row.utilization)
                                    : '-'}
                            </TableCell>
                        )}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
