import type { InboxListItemProps } from '@/types/inbox';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Bot, User, Clock, Briefcase, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ApprovalListItem displays a single approval item in the inbox list.
 * Shows source, work order context, urgency, AI confidence, and waiting time.
 * Supports bulk selection with checkbox.
 */
export function ApprovalListItem({ item, isSelected, onSelect, onView }: InboxListItemProps) {
    // Urgency color for left border
    const urgencyBorderColors = {
        urgent: 'border-l-red-500',
        high: 'border-l-orange-500',
        normal: 'border-l-slate-300 dark:border-l-slate-700',
    };

    // AI confidence badge styling
    const confidenceVariants = {
        high: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
        medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
        low: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
    };

    return (
        <div
            className={cn(
                'flex items-start gap-4 p-4 border-l-4 hover:bg-muted/50 transition-colors',
                urgencyBorderColors[item.urgency],
                isSelected && 'bg-muted/50'
            )}
        >
            {/* Checkbox for bulk selection */}
            <div className="pt-1">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={onSelect}
                    aria-label={`Select ${item.title}`}
                />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0 cursor-pointer" onClick={onView}>
                {/* Header Row - Badges and Waiting Time */}
                <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                        {/* Badge Row */}
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            {/* Approval Type Badge */}
                            <Badge
                                variant="outline"
                                className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs"
                            >
                                Approval
                            </Badge>

                            {/* Urgency Badge */}
                            {item.urgency === 'urgent' && (
                                <Badge variant="destructive" className="text-xs font-semibold">
                                    URGENT
                                </Badge>
                            )}
                            {item.urgency === 'high' && (
                                <Badge
                                    variant="outline"
                                    className="text-xs border-orange-500 text-orange-600 dark:text-orange-400"
                                >
                                    HIGH
                                </Badge>
                            )}

                            {/* AI Confidence Badge */}
                            {item.aiConfidence && (
                                <Badge
                                    variant="outline"
                                    className={cn('text-xs border-0', confidenceVariants[item.aiConfidence])}
                                >
                                    {item.aiConfidence.charAt(0).toUpperCase() + item.aiConfidence.slice(1)} confidence
                                </Badge>
                            )}
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-semibold text-foreground truncate">
                            {item.title}
                        </h3>
                    </div>

                    {/* Waiting Time Indicator */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        <Clock className="w-3 h-3" aria-hidden="true" />
                        <span>{item.waitingHours}h</span>
                    </div>
                </div>

                {/* Content Preview */}
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {item.contentPreview}
                </p>

                {/* Metadata Footer */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    {/* Source */}
                    <div className="flex items-center gap-1.5">
                        {item.sourceType === 'ai_agent' ? (
                            <Bot className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                            <User className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span className="font-medium">{item.sourceName}</span>
                    </div>

                    {/* Work Order Context */}
                    {item.relatedWorkOrderTitle && (
                        <div className="flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{item.relatedWorkOrderTitle}</span>
                        </div>
                    )}

                    {/* Project Context */}
                    {item.relatedProjectName && !item.relatedWorkOrderTitle && (
                        <div className="flex items-center gap-1.5">
                            <FolderKanban className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{item.relatedProjectName}</span>
                        </div>
                    )}

                    {/* QA Validation Badge */}
                    {item.qaValidation && (
                        <Badge
                            variant={item.qaValidation === 'passed' ? 'outline' : 'destructive'}
                            className="text-xs"
                        >
                            QA {item.qaValidation}
                        </Badge>
                    )}
                </div>
            </div>
        </div>
    );
}
