import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { MessageItemProps, MessageType } from '@/types/communications';
import { Bot, Edit, MoreVertical, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { MessageAttachments } from './message-attachments';
import { MessageReactions } from './message-reactions';
import { ReactionPicker } from './reaction-picker';

// Message type badge colors matching backend MessageType enum
const messageTypeColors: Record<MessageType, string> = {
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

const messageTypeLabels: Record<MessageType, string> = {
    note: 'Note',
    suggestion: 'Suggestion',
    decision: 'Decision',
    question: 'Question',
    status_update: 'Status Update',
    approval_request: 'Approval Request',
    message: 'Message',
};

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

export function MessageItem({
    message,
    currentUserId,
    onEdit,
    onDelete,
}: MessageItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);

    const isOwnMessage = message.authorId === currentUserId;
    const isAiMessage = message.authorType === 'ai_agent';
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

    const handleReactionAdd = (emoji: string) => {
        // This will be handled by the parent component via API call
        // For now, we just need to pass it up
        console.log('Add reaction:', emoji, 'to message:', message.id);
    };

    const handleToggleReaction = (emoji: string) => {
        // Toggle reaction - if user has reacted, remove; otherwise add
        console.log('Toggle reaction:', emoji, 'on message:', message.id);
    };

    return (
        <div
            className={cn(
                'group relative rounded-lg p-3',
                isAiMessage
                    ? 'border border-purple-200/50 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 dark:border-purple-800/30 dark:from-purple-950/20 dark:to-indigo-950/20'
                    : 'bg-muted/50 hover:bg-muted',
            )}
        >
            {/* Header */}
            <div className="mb-1 flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
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
                            messageTypeColors[message.type] ||
                                messageTypeColors.note,
                        )}
                    >
                        {messageTypeLabels[message.type] || message.type}
                    </Badge>

                    {/* Timestamp */}
                    <span className="text-xs text-muted-foreground">
                        {formatTimestamp(message.timestamp)}
                    </span>

                    {/* Edited indicator */}
                    {message.editedAt && (
                        <span className="text-xs text-muted-foreground italic">
                            (edited)
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                    <ReactionPicker
                        messageId={message.id}
                        onReactionAdd={handleReactionAdd}
                    />

                    {showActions && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                    aria-label="Message actions"
                                >
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {message.canEdit && (
                                    <DropdownMenuItem
                                        onClick={() => setIsEditing(true)}
                                    >
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                    </DropdownMenuItem>
                                )}
                                {message.canDelete && (
                                    <DropdownMenuItem
                                        onClick={() => onDelete(message.id)}
                                        className="text-destructive"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>

            {/* Content */}
            {isEditing ? (
                <div className="mt-2">
                    <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[60px] w-full resize-none rounded-md border border-input bg-background p-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                        autoFocus
                    />
                    <div className="mt-2 flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit}>
                            Save
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            ) : (
                <p className="text-sm break-words whitespace-pre-wrap">
                    {message.content}
                </p>
            )}

            {/* Attachments */}
            <MessageAttachments attachments={message.attachments} />

            {/* Reactions */}
            <MessageReactions
                reactions={message.reactions}
                messageId={message.id}
                currentUserId={currentUserId}
                onToggleReaction={handleToggleReaction}
            />
        </div>
    );
}
