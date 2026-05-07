import { useState, useEffect, useCallback, useRef } from 'react';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Loader2,
    MoreVertical,
    Edit,
    Trash2,
    Send,
    X,
    MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnnotationPopoverProps, DocumentAnnotation } from '@/types/documents.d';
import type { CommunicationMessage } from '@/types/communications.d';
import { getCsrfToken } from '@/lib/csrf';

/**
 * Format timestamp to relative time.
 */
function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });
}

/**
 * Get initials from name for avatar.
 */
function getInitials(name: string): string {
    return name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

interface AnnotationThreadMessageProps {
    message: CommunicationMessage;
    currentUserId: string;
    onEdit?: (messageId: string, content: string) => void;
    onDelete?: (messageId: string) => void;
}

/**
 * Individual message in the annotation thread.
 */
function AnnotationThreadMessage({
    message,
    currentUserId,
    onEdit,
    onDelete,
}: AnnotationThreadMessageProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);

    const isOwnMessage = message.authorId === currentUserId;
    const showActions = isOwnMessage && (message.canEdit || message.canDelete);

    const handleSaveEdit = () => {
        if (editContent.trim() && editContent !== message.content && onEdit) {
            onEdit(message.id, editContent.trim());
        }
        setIsEditing(false);
    };

    return (
        <div className="group flex gap-2 p-2 rounded hover:bg-muted/50">
            <Avatar className="h-6 w-6 shrink-0">
                <AvatarFallback className="text-[10px]">
                    {getInitials(message.authorName)}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{message.authorName}</span>
                    <span className="text-[10px] text-muted-foreground">
                        {formatTimestamp(message.timestamp)}
                    </span>
                    {message.editedAt && (
                        <span className="text-[10px] text-muted-foreground italic">
                            (edited)
                        </span>
                    )}

                    {showActions && !isEditing && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                                    aria-label="Message actions"
                                >
                                    <MoreVertical className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {message.canEdit && (
                                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                        <Edit className="h-3 w-3 mr-2" />
                                        Edit
                                    </DropdownMenuItem>
                                )}
                                {message.canDelete && onDelete && (
                                    <DropdownMenuItem
                                        onClick={() => onDelete(message.id)}
                                        className="text-destructive"
                                    >
                                        <Trash2 className="h-3 w-3 mr-2" />
                                        Delete
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {isEditing ? (
                    <div className="mt-1 space-y-1">
                        <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-[40px] text-xs resize-none"
                            autoFocus
                        />
                        <div className="flex gap-1">
                            <Button size="sm" className="h-6 text-xs" onClick={handleSaveEdit}>
                                Save
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs"
                                onClick={() => {
                                    setEditContent(message.content);
                                    setIsEditing(false);
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <p className="text-xs whitespace-pre-wrap break-words mt-0.5">
                        {message.content}
                    </p>
                )}
            </div>
        </div>
    );
}

interface AnnotationDetailsResponse {
    annotation: DocumentAnnotation & {
        messages?: CommunicationMessage[];
    };
}

/**
 * AnnotationPopover component displays the comment thread for a specific annotation.
 *
 * Features:
 * - Display comment thread for specific annotation
 * - Support adding replies to annotation thread
 * - Position relative to marker (popover)
 * - Close on click outside or explicit dismiss
 */
export function AnnotationPopover({
    annotation,
    documentId,
    onClose,
    onReplyAdded,
    anchorPosition,
}: AnnotationPopoverProps) {
    const [messages, setMessages] = useState<CommunicationMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string>('');

    // Reply state
    const [replyContent, setReplyContent] = useState('');
    const [isSending, setIsSending] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch annotation details with messages
    const fetchAnnotationDetails = useCallback(async () => {
        if (!annotation) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `/documents/${documentId}/annotations/${annotation.id}`,
                {
                    credentials: 'same-origin',
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch annotation details');
            }

            const data: AnnotationDetailsResponse = await response.json();
            setMessages(data.annotation.messages || []);

            // Determine current user ID
            if (data.annotation.messages && data.annotation.messages.length > 0) {
                const ownMessage = data.annotation.messages.find(
                    (m) => m.canEdit || m.canDelete
                );
                if (ownMessage) {
                    setCurrentUserId(ownMessage.authorId);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    }, [annotation, documentId]);

    // Handle adding a reply
    const handleAddReply = useCallback(async () => {
        if (!annotation || !replyContent.trim()) return;

        setIsSending(true);
        setError(null);

        try {
            const response = await fetch(
                `/documents/${documentId}/annotations/${annotation.id}/reply`,
                {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                    body: JSON.stringify({ content: replyContent.trim() }),
                }
            );

            if (!response.ok) {
                throw new Error('Failed to add reply');
            }

            setReplyContent('');
            fetchAnnotationDetails();
            onReplyAdded?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add reply');
        } finally {
            setIsSending(false);
        }
    }, [annotation, documentId, replyContent, fetchAnnotationDetails, onReplyAdded]);

    // Handle keyboard shortcuts
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleAddReply();
            }
        },
        [handleAddReply]
    );

    // Scroll to bottom when messages change
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    // Fetch details when annotation changes
    useEffect(() => {
        if (annotation) {
            fetchAnnotationDetails();
        }
    }, [annotation, fetchAnnotationDetails]);

    // Scroll to bottom when messages load
    useEffect(() => {
        if (messages.length > 0 && !isLoading) {
            scrollToBottom();
        }
    }, [messages.length, isLoading, scrollToBottom]);

    const isOpen = annotation !== null;

    return (
        <Popover open={isOpen} onOpenChange={(open) => !open && onClose()}>
            {/* Invisible anchor positioned at the annotation */}
            {anchorPosition && (
                <PopoverAnchor
                    style={{
                        position: 'absolute',
                        left: `${anchorPosition.x}%`,
                        top: `${anchorPosition.y}%`,
                        width: 1,
                        height: 1,
                    }}
                />
            )}

            <PopoverContent
                side="right"
                align="start"
                className="w-80 p-0"
                sideOffset={12}
                data-testid="annotation-popover"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                        <span className="text-sm font-medium">Annotation</span>
                        {annotation?.isForPdf && annotation.page && (
                            <span className="text-xs text-muted-foreground">
                                Page {annotation.page}
                            </span>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={onClose}
                        aria-label="Close annotation"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Messages */}
                <div className="max-h-60 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-6 px-3 gap-2">
                            <p className="text-xs text-destructive">{error}</p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={fetchAnnotationDetails}
                            >
                                Try again
                            </Button>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                            <p className="text-xs text-muted-foreground">
                                No messages in this thread.
                            </p>
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            {messages.map((message) => (
                                <AnnotationThreadMessage
                                    key={message.id}
                                    message={message}
                                    currentUserId={currentUserId}
                                />
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Reply input */}
                <div className="p-3 border-t space-y-2">
                    {error && (
                        <div className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
                            {error}
                        </div>
                    )}

                    <div onKeyDown={handleKeyDown}>
                        <Textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Add a reply..."
                            className="min-h-[50px] text-xs resize-none"
                            disabled={isSending}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">
                            Ctrl+Enter
                        </span>
                        <Button
                            onClick={handleAddReply}
                            disabled={isSending || !replyContent.trim()}
                            size="sm"
                            className="h-7"
                        >
                            {isSending ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                                <Send className="h-3 w-3 mr-1" aria-hidden="true" />
                            )}
                            Reply
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
