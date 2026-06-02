import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { RateEditForm } from './rate-edit-form';

export interface RateEntry {
    id: string;
    internalRate: number;
    billingRate: number;
    effectiveDate: string;
}

export interface TeamMemberRate {
    userId: string;
    userName: string;
    userEmail: string;
    currentRate: RateEntry | null;
    rateHistory: RateEntry[];
}

export interface TeamMember {
    id: string;
    name: string;
    email: string;
}

interface TeamMemberRateTableProps {
    rates: TeamMemberRate[];
    teamMembers: TeamMember[];
}

export function TeamMemberRateTable({ rates }: TeamMemberRateTableProps) {
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<{
        userId: string;
        userName: string;
    } | null>(null);
    const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

    const formatCurrency = (value: number | null): string => {
        if (value === null || value === undefined) {
            return 'Not set';
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(value);
    };

    const formatDate = (dateString: string | null): string => {
        if (!dateString) {
            return 'Not set';
        }
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(new Date(dateString));
    };

    const handleAddRateClick = (rate: TeamMemberRate) => {
        setSelectedMember({
            userId: rate.userId,
            userName: rate.userName,
        });
        setEditDialogOpen(true);
    };

    const handleDialogClose = () => {
        setEditDialogOpen(false);
        setSelectedMember(null);
    };

    const handleSuccess = () => {
        handleDialogClose();
    };

    const toggleExpand = (userId: string) => {
        setExpandedUsers(prev => {
            const next = new Set(prev);
            if (next.has(userId)) {
                next.delete(userId);
            } else {
                next.add(userId);
            }
            return next;
        });
    };

    const hasHistory = (rate: TeamMemberRate) => rate.rateHistory.length > 1;

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead>Member</TableHead>
                        <TableHead className="text-right">Internal Rate</TableHead>
                        <TableHead className="text-right">Billing Rate</TableHead>
                        <TableHead>Effective Date</TableHead>
                        <TableHead className="w-[100px]">
                            <span className="sr-only">Actions</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rates.map((rate) => {
                        const isExpanded = expandedUsers.has(rate.userId);
                        const showHistory = hasHistory(rate);

                        return (
                            <React.Fragment key={rate.userId}>
                                {/* Main row */}
                                <TableRow>
                                    <TableCell className="w-[40px]">
                                        {showHistory && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => toggleExpand(rate.userId)}
                                                aria-label={isExpanded ? 'Collapse history' : 'Expand history'}
                                            >
                                                {isExpanded ? (
                                                    <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4" />
                                                )}
                                            </Button>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                                                {rate.userName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-medium">{rate.userName}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {rate.userEmail}
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className={rate.currentRate === null ? 'text-muted-foreground' : ''}>
                                            {rate.currentRate ? formatCurrency(rate.currentRate.internalRate) : 'Not set'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className={rate.currentRate === null ? 'text-muted-foreground' : ''}>
                                            {rate.currentRate ? formatCurrency(rate.currentRate.billingRate) : 'Not set'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className={rate.currentRate === null ? 'text-muted-foreground' : ''}>
                                            {rate.currentRate ? formatDate(rate.currentRate.effectiveDate) : 'Not set'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleAddRateClick(rate)}
                                            aria-label={`Add new rate for ${rate.userName}`}
                                        >
                                            <Plus className="h-4 w-4 mr-1" />
                                            Add Rate
                                        </Button>
                                    </TableCell>
                                </TableRow>

                                {/* History rows */}
                                {isExpanded && rate.rateHistory.slice(1).map((historyRate, index) => (
                                    <TableRow
                                        key={`${rate.userId}-history-${historyRate.id}`}
                                        className="bg-muted/30"
                                    >
                                        <TableCell></TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3 pl-4">
                                                <div className="text-xs text-muted-foreground">
                                                    └ Previous rate {index + 1}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            {formatCurrency(historyRate.internalRate)}
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            {formatCurrency(historyRate.billingRate)}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatDate(historyRate.effectiveDate)}
                                        </TableCell>
                                        <TableCell>
                                            {/* No actions for history rows - rates are immutable */}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </React.Fragment>
                        );
                    })}
                </TableBody>
            </Table>

            <Dialog open={editDialogOpen} onOpenChange={handleDialogClose}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add New Rate</DialogTitle>
                        <DialogDescription>
                            Create a new hourly rate for {selectedMember?.userName}.
                            This will be used for time entries on or after the effective date.
                            Previous rates are preserved for historical cost calculations.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedMember && (
                        <RateEditForm
                            userId={selectedMember.userId}
                            userName={selectedMember.userName}
                            onSuccess={handleSuccess}
                            onCancel={handleDialogClose}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
