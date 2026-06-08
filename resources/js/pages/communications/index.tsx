import { Badge } from '@/components/ui/badge';
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
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    Bot,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Filter,
    Search,
    X,
} from 'lucide-react';
import { useCallback, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Communications', href: '/communications' },
];

// Message type badge colors matching the message-item component
const messageTypeColors: Record<string, string> = {
    note: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    suggestion:
        'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900',
    decision:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
    question:
        'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-900',
    status_update:
        'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-900',
    approval_request:
        'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border-purple-200 dark:border-purple-900',
    message:
        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
};

interface CommunicationsIndexProps {
    messages: {
        data: Array<{
            id: string;
            threadId: string;
            authorId: string;
            authorName: string;
            authorType: string;
            timestamp: string;
            content: string;
            type: string;
            typeLabel: string;
            typeColor: string;
            editedAt: string | null;
            canEdit: boolean;
            canDelete: boolean;
            mentions: Array<{
                id: string;
                type: string;
                entityId: string;
                name: string;
            }>;
            attachments: Array<{
                id: string;
                name: string;
                fileUrl: string;
                fileSize: number;
                mimeType: string;
            }>;
            reactions: Array<{
                emoji: string;
                count: number;
                hasReacted: boolean;
                users: Array<{ id: string }>;
            }>;
            workItem: {
                type: string;
                typeLabel: string;
                id: string;
                name: string;
                route: string;
            } | null;
        }>;
        meta: {
            total: number;
            currentPage: number;
            perPage: number;
            lastPage: number;
        };
        links: {
            first: string | null;
            last: string | null;
            prev: string | null;
            next: string | null;
        };
    };
    filters: {
        type: string | null;
        message_type: string | null;
        from: string | null;
        to: string | null;
        search: string | null;
    };
    filterOptions: {
        types: Array<{ value: string; label: string }>;
        messageTypes: Array<{ value: string; label: string; color: string }>;
    };
}

function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
        return 'Just now';
    }
    if (diffMins < 60) {
        return `${diffMins}m ago`;
    }
    if (diffHours < 24) {
        return `${diffHours}h ago`;
    }
    if (diffDays < 7) {
        return `${diffDays}d ago`;
    }

    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
}

export default function CommunicationsIndex({
    messages,
    filters,
    filterOptions,
}: CommunicationsIndexProps) {
    const [searchValue, setSearchValue] = useState(filters.search || '');

    // Apply filters with debounce for search
    const applyFilters = useCallback(
        (newFilters: Record<string, string | null>) => {
            const currentParams: Record<string, string> = {};

            // Preserve existing filters
            if (filters.type) currentParams.type = filters.type;
            if (filters.message_type)
                currentParams.message_type = filters.message_type;
            if (filters.from) currentParams.from = filters.from;
            if (filters.to) currentParams.to = filters.to;
            if (filters.search) currentParams.search = filters.search;

            // Apply new filters
            for (const [key, value] of Object.entries(newFilters)) {
                if (value) {
                    currentParams[key] = value;
                } else {
                    delete currentParams[key];
                }
            }

            router.get('/communications', currentParams, {
                preserveState: true,
                preserveScroll: true,
            });
        },
        [filters],
    );

    const handleSearch = useCallback(() => {
        applyFilters({ search: searchValue || null });
    }, [searchValue, applyFilters]);

    const handleSearchKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        },
        [handleSearch],
    );

    const handleClearFilters = useCallback(() => {
        setSearchValue('');
        router.get(
            '/communications',
            {},
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    }, []);

    const hasActiveFilters = !!(
        filters.type ||
        filters.message_type ||
        filters.search
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Communications" />

            <div className="flex h-full flex-1 flex-col">
                {/* Header */}
                <div className="border-b border-sidebar-border/70 px-4 py-4 sm:px-6 sm:py-6 dark:border-sidebar-border">
                    <div className="mb-4">
                        <h1 className="text-2xl font-bold text-foreground">
                            Communications
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            View all communications across projects, work
                            orders, and tasks.
                        </p>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-end gap-4">
                        {/* Search */}
                        <div className="w-full flex-1 sm:max-w-[400px] sm:min-w-[200px]">
                            <Label
                                htmlFor="search-messages"
                                className="sr-only"
                            >
                                Search messages
                            </Label>
                            <div className="relative">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="search-messages"
                                    type="text"
                                    placeholder="Search messages..."
                                    value={searchValue}
                                    onChange={(e) =>
                                        setSearchValue(e.target.value)
                                    }
                                    onKeyDown={handleSearchKeyDown}
                                    className="pr-4 pl-10"
                                />
                            </div>
                        </div>

                        {/* Work Item Type Filter */}
                        <div className="flex-1 sm:min-w-[150px] sm:flex-none">
                            <Label
                                htmlFor="work-item-type"
                                className="mb-1 block text-xs text-muted-foreground"
                            >
                                Work Item Type
                            </Label>
                            <Select
                                value={filters.type || 'all'}
                                onValueChange={(value) =>
                                    applyFilters({
                                        type: value === 'all' ? null : value,
                                    })
                                }
                            >
                                <SelectTrigger
                                    id="work-item-type"
                                    className="w-full"
                                >
                                    <SelectValue placeholder="All types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All types
                                    </SelectItem>
                                    {filterOptions.types.map((type) => (
                                        <SelectItem
                                            key={type.value}
                                            value={type.value}
                                        >
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Message Type Filter */}
                        <div className="flex-1 sm:min-w-[150px] sm:flex-none">
                            <Label
                                htmlFor="message-type"
                                className="mb-1 block text-xs text-muted-foreground"
                            >
                                Message Type
                            </Label>
                            <Select
                                value={filters.message_type || 'all'}
                                onValueChange={(value) =>
                                    applyFilters({
                                        message_type:
                                            value === 'all' ? null : value,
                                    })
                                }
                            >
                                <SelectTrigger
                                    id="message-type"
                                    className="w-full"
                                >
                                    <SelectValue placeholder="All types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All types
                                    </SelectItem>
                                    {filterOptions.messageTypes.map((type) => (
                                        <SelectItem
                                            key={type.value}
                                            value={type.value}
                                        >
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Search Button */}
                        <Button onClick={handleSearch} size="sm">
                            <Filter className="mr-2 h-4 w-4" />
                            Apply
                        </Button>

                        {/* Clear Filters */}
                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClearFilters}
                            >
                                <X className="mr-2 h-4 w-4" />
                                Clear
                            </Button>
                        )}
                    </div>
                </div>

                {/* Message List */}
                <div className="flex-1 overflow-auto p-6">
                    {messages.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl bg-muted/50 py-16 text-center">
                            <p className="text-lg text-muted-foreground">
                                No messages found
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {hasActiveFilters
                                    ? 'Try adjusting your filters.'
                                    : 'Communications will appear here.'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.data.map((message) => {
                                const isAiMessage =
                                    message.authorType === 'ai_agent';

                                return (
                                    <div
                                        key={message.id}
                                        className={cn(
                                            'rounded-lg border p-4',
                                            isAiMessage
                                                ? 'border-purple-200/50 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 dark:border-purple-800/30 dark:from-purple-950/20 dark:to-indigo-950/20'
                                                : 'border-border bg-card',
                                        )}
                                    >
                                        {/* Message Header */}
                                        <div className="mb-2 flex flex-wrap items-center gap-2">
                                            <span className="font-medium text-foreground">
                                                {message.authorName}
                                            </span>

                                            {/* AI Badge */}
                                            {isAiMessage && (
                                                <Badge
                                                    variant="outline"
                                                    className="h-5 border-purple-200 bg-purple-100 px-1.5 text-xs text-purple-700 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-300"
                                                >
                                                    <Bot className="mr-1 h-3 w-3" />
                                                    AI Suggestion
                                                </Badge>
                                            )}

                                            {/* Message type badge */}
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    'h-5 px-1.5 text-xs capitalize',
                                                    messageTypeColors[
                                                        message.type
                                                    ] || messageTypeColors.note,
                                                )}
                                            >
                                                {message.typeLabel ||
                                                    message.type}
                                            </Badge>

                                            {/* Timestamp */}
                                            <span className="text-xs text-muted-foreground">
                                                {formatTimestamp(
                                                    message.timestamp,
                                                )}
                                            </span>

                                            {/* Edited indicator */}
                                            {message.editedAt && (
                                                <span className="text-xs text-muted-foreground italic">
                                                    (edited)
                                                </span>
                                            )}
                                        </div>

                                        {/* Work Item Context */}
                                        {message.workItem && (
                                            <div className="mb-2">
                                                <Link
                                                    href={
                                                        message.workItem.route
                                                    }
                                                    className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                                                >
                                                    <span className="text-muted-foreground">
                                                        {
                                                            message.workItem
                                                                .typeLabel
                                                        }
                                                        :
                                                    </span>
                                                    <span className="font-medium">
                                                        {message.workItem.name}
                                                    </span>
                                                    <ExternalLink className="h-3 w-3" />
                                                </Link>
                                            </div>
                                        )}

                                        {/* Message Content */}
                                        <p className="text-sm break-words whitespace-pre-wrap text-foreground">
                                            {message.content}
                                        </p>

                                        {/* Attachments */}
                                        {message.attachments.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {message.attachments.map(
                                                    (attachment) => (
                                                        <a
                                                            key={attachment.id}
                                                            href={
                                                                attachment.fileUrl
                                                            }
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="rounded bg-muted px-2 py-1 text-xs hover:bg-muted/80"
                                                        >
                                                            {attachment.name}
                                                        </a>
                                                    ),
                                                )}
                                            </div>
                                        )}

                                        {/* Reactions */}
                                        {message.reactions.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-1">
                                                {message.reactions.map(
                                                    (reaction) => (
                                                        <span
                                                            key={reaction.emoji}
                                                            className="rounded-full bg-muted px-2 py-0.5 text-xs"
                                                        >
                                                            {reaction.emoji}{' '}
                                                            {reaction.count}
                                                        </span>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Pagination */}
                    {messages.meta.lastPage > 1 && (
                        <div className="mt-6 flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                Page {messages.meta.currentPage} of{' '}
                                {messages.meta.lastPage} ({messages.meta.total}{' '}
                                messages)
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!messages.links.prev}
                                    onClick={() => {
                                        if (messages.links.prev) {
                                            router.visit(messages.links.prev, {
                                                preserveState: true,
                                                preserveScroll: true,
                                            });
                                        }
                                    }}
                                >
                                    <ChevronLeft className="mr-1 h-4 w-4" />
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!messages.links.next}
                                    onClick={() => {
                                        if (messages.links.next) {
                                            router.visit(messages.links.next, {
                                                preserveState: true,
                                                preserveScroll: true,
                                            });
                                        }
                                    }}
                                >
                                    Next
                                    <ChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
