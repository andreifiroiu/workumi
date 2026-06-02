import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Bot,
    Clock,
    Link as LinkIcon,
    Eye,
    CheckCircle,
    XCircle,
    User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCommunicationTypeLabel } from '@/components/client-comms/CommunicationTypeSelector';
import type { AgentDraftInboxItemProps } from '@/types/client-comms.d';

/**
 * Confidence badge color mapping
 */
const confidenceColors = {
    high: 'text-green-600 dark:text-green-400',
    medium: 'text-amber-600 dark:text-amber-400',
    low: 'text-red-600 dark:text-red-400',
};

/**
 * AgentDraftInboxItem displays an AI-generated draft communication in the inbox.
 * Extends the existing InboxItem display pattern with draft-specific metadata.
 * Includes quick actions: View Full Draft, Approve, Reject.
 */
export function AgentDraftInboxItem({
    item,
    isSelected,
    onSelect,
    onView,
    onQuickApprove,
    onQuickReject,
}: AgentDraftInboxItemProps) {
    return (
        <div
            className={cn(
                'flex items-start gap-4 p-4 border-l-4 border-l-blue-500 hover:bg-muted/50 transition-colors',
                isSelected && 'bg-muted/50'
            )}
        >
            {/* Checkbox */}
            <div className="pt-1">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={onSelect}
                    aria-label={`Select draft: ${item.title}`}
                />
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400">
                                Agent Draft
                            </Badge>
                            {item.communicationType && (
                                <Badge variant="outline" className="text-xs">
                                    {getCommunicationTypeLabel(item.communicationType)}
                                </Badge>
                            )}
                        </div>
                        <h3
                            className="text-base font-semibold text-foreground truncate cursor-pointer hover:text-primary"
                            onClick={onView}
                        >
                            {item.title}
                        </h3>
                    </div>

                    {/* Waiting time */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                        <Clock className="w-3 h-3" aria-hidden="true" />
                        <span>{item.waitingHours}h ago</span>
                    </div>
                </div>

                {/* Content Preview */}
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {item.contentPreview}
                </p>

                {/* Metadata Footer */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    {/* Source - AI Agent */}
                    <div className="flex items-center gap-1">
                        <Bot className="w-3 h-3 text-blue-500" aria-hidden="true" />
                        <span>AI Generated</span>
                    </div>

                    {/* Recipient */}
                    {item.recipientName && (
                        <div className="flex items-center gap-1">
                            <User className="w-3 h-3" aria-hidden="true" />
                            <span>To: {item.recipientName}</span>
                        </div>
                    )}

                    {/* Related items */}
                    {(item.relatedWorkOrderTitle || item.relatedProjectName) && (
                        <div className="flex items-center gap-1">
                            <LinkIcon className="w-3 h-3" aria-hidden="true" />
                            <span>
                                {item.relatedWorkOrderTitle || item.relatedProjectName}
                            </span>
                        </div>
                    )}

                    {/* AI Confidence */}
                    <div className="flex items-center gap-1">
                        <span className={cn('font-medium', confidenceColors[item.confidence])}>
                            {item.confidence.toUpperCase()} confidence
                        </span>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onView}
                        className="gap-1.5"
                    >
                        <Eye className="h-3.5 w-3.5" />
                        View Draft
                    </Button>
                    {onQuickApprove && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                onQuickApprove();
                            }}
                            className="gap-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                        >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Approve
                        </Button>
                    )}
                    {onQuickReject && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                onQuickReject();
                            }}
                            className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
