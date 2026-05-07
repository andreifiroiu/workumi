import { useState, useEffect, useCallback, useRef } from 'react';
import { router } from '@inertiajs/react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    ChevronDown,
    ChevronRight,
    Loader2,
    MessageSquare,
    MoreVertical,
    Edit,
    Trash2,
    Send,
    RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DocumentCommentsProps } from '@/types/documents.d';
import type { CommunicationMessage, CommunicationThread } from '@/types/communications.d';
import { getCsrfToken } from '@/lib/csrf';

interface ApiResponse {
    thread: CommunicationThread | null;
    messages: CommunicationMessage[];
}

const DEFAULT_POLL_INTERVAL_MS = 30000; // 30 seconds

/**
 * Format a timestamp to a human-readable relative time.
 */
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

/**
 * Get initials from a name for avatar fallback.
 */
function getInitials(name: string): string {
    return name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

interface CommentItemProps {
    message: CommunicationMessage;
    currentUserId: string;
    onEdit: (messageId: string, content: string) => void;
    onDelete: (messageId: string) => void;
}

/**
 * Individual comment item component.
 */
function CommentItem({ message, currentUserId, onEdit, onDelete }: CommentItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);

    const isOwnMessage = message.authorId === currentUserId;
    const showActions = isOwnMessage && (message.canEdit || message.canDelete);

    const handleSaveEdit = () => {
        if (editContent.trim() && editContent !== message.content) {
            onEdit(message.id, editContent.trim());
        }
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditContent(message.content);
        setIsEditing(false);
    };

    return (
        <div className="group flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
            <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs">
                    {getInitials(message.authorName)}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{message.authorName}</span>
                        <span className="text-xs text-muted-foreground">
                            {formatTimestamp(message.timestamp)}
                        </span>
                        {message.editedAt && (
                            <span className="text-xs text-muted-foreground italic">
                                (edited)
                            </span>
                        )}
                    </div>

                    {showActions && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label="Comment actions"
                                >
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {message.canEdit && (
                                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                    </DropdownMenuItem>
                                )}
                                {message.canDelete && (
                                    <DropdownMenuItem
                                        onClick={() => onDelete(message.id)}
                                        className="text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {isEditing ? (
                    <div className="mt-2 space-y-2">
                        <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-[60px] text-sm resize-none"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveEdit}>
                                Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <p className="mt-1 text-sm whitespace-pre-wrap break-words">
                        {message.content}
                    </p>
                )}
            </div>
        </div>
    );
}

/**
 * DocumentComments component displays thread-level comments in a collapsible panel.
 * Follows existing CommunicationThread UI patterns with support for adding,
 * editing, and deleting comments.
 */
export function DocumentComments({
    documentId,
    isOpen,
    onOpenChange,
}: DocumentCommentsProps) {
    const [thread, setThread] = useState<CommunicationThread | null>(null);
    const [messages, setMessages] = useState<CommunicationMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string>('');

    // New comment state
    const [newComment, setNewComment] = useState('');
    const [isSending, setIsSending] = useState(false);

    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch comments from API
    const fetchComments = useCallback(
        async (showLoading = true) => {
            if (showLoading) {
                setIsLoading(true);
            } else {
                setIsRefreshing(true);
            }
            setError(null);

            try {
                const response = await fetch(`/documents/${documentId}/comments`, {
                    credentials: 'same-origin',
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch comments');
                }

                const data: ApiResponse = await response.json();
                setThread(data.thread);
                setMessages(data.messages || []);

                // Determine current user ID from editable messages
                if (data.messages.length > 0) {
                    const ownMessage = data.messages.find((m) => m.canEdit || m.canDelete);
                    if (ownMessage) {
                        setCurrentUserId(ownMessage.authorId);
                    }
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        },
        [documentId]
    );

    // Handle adding a new comment
    const handleAddComment = useCallback(async () => {
        if (!newComment.trim()) return;

        setIsSending(true);
        setError(null);

        try {
            const response = await fetch(`/documents/${documentId}/comments`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({ content: newComment.trim() }),
            });

            if (!response.ok) {
                throw new Error('Failed to add comment');
            }

            setNewComment('');
            fetchComments(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add comment');
        } finally {
            setIsSending(false);
        }
    }, [documentId, newComment, fetchComments]);

    // Handle editing a comment
    const handleEdit = useCallback(
        async (messageId: string, content: string) => {
            try {
                const response = await fetch(`/documents/${documentId}/comments/${messageId}`, {
                    method: 'PATCH',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                    body: JSON.stringify({ content }),
                });

                if (!response.ok) {
                    throw new Error('Failed to edit comment');
                }

                fetchComments(false);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to edit comment');
            }
        },
        [documentId, fetchComments]
    );

    // Handle deleting a comment
    const handleDelete = useCallback(
        async (messageId: string) => {
            if (!confirm('Are you sure you want to delete this comment?')) {
                return;
            }

            try {
                const response = await fetch(`/documents/${documentId}/comments/${messageId}`, {
                    method: 'DELETE',
                    credentials: 'same-origin',
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to delete comment');
                }

                fetchComments(false);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to delete comment');
            }
        },
        [documentId, fetchComments]
    );

    // Scroll to bottom of messages
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    // Handle keyboard shortcuts
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleAddComment();
            }
        },
        [handleAddComment]
    );

    // Set up polling when panel is open
    useEffect(() => {
        if (isOpen) {
            fetchComments();

            pollIntervalRef.current = setInterval(() => {
                fetchComments(false);
            }, DEFAULT_POLL_INTERVAL_MS);
        }

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };
    }, [isOpen, fetchComments]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messages.length > 0 && !isLoading) {
            scrollToBottom();
        }
    }, [messages.length, isLoading, scrollToBottom]);

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={onOpenChange}
            className="border rounded-lg bg-card"
            data-testid="document-comments"
        >
            <CollapsibleTrigger asChild>
                <Button
                    variant="ghost"
                    className="w-full justify-between p-4 h-auto hover:bg-muted/50"
                >
                    <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" aria-hidden="true" />
                        <span className="font-medium">Document Comments</span>
                        {thread && thread.messageCount > 0 && (
                            <Badge variant="secondary" className="ml-1">
                                {thread.messageCount}
                            </Badge>
                        )}
                    </div>
                    {isOpen ? (
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    ) : (
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    )}
                </Button>
            </CollapsibleTrigger>

            <CollapsibleContent>
                <div className="border-t p-4 space-y-4">
                    {/* Refresh button */}
                    <div className="flex justify-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => fetchComments(false)}
                            disabled={isRefreshing}
                            aria-label="Refresh comments"
                        >
                            <RefreshCw
                                className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
                            />
                        </Button>
                    </div>

                    {/* Comments list */}
                    <div className="max-h-80 overflow-y-auto space-y-1">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center py-8 gap-2">
                                <p className="text-sm text-destructive">{error}</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fetchComments()}
                                >
                                    Try again
                                </Button>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <MessageSquare className="h-10 w-10 text-muted-foreground/50 mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    No comments yet
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Be the first to comment!
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Reverse to show oldest first */}
                                {[...messages].reverse().map((message) => (
                                    <CommentItem
                                        key={message.id}
                                        message={message}
                                        currentUserId={currentUserId}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                    />
                                ))}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>

                    {/* New comment input */}
                    <div className="border-t pt-4 space-y-2">
                        {error && (
                            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                                {error}
                            </div>
                        )}

                        <div onKeyDown={handleKeyDown}>
                            <Textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add a comment..."
                                className="min-h-[80px] resize-none"
                                disabled={isSending}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                                Ctrl+Enter to send
                            </span>
                            <Button
                                onClick={handleAddComment}
                                disabled={isSending || !newComment.trim()}
                                size="sm"
                            >
                                {isSending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Send className="h-4 w-4 mr-2" aria-hidden="true" />
                                )}
                                Send
                            </Button>
                        </div>
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
