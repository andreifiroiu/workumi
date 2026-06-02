import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Bot, ChevronDown, ChevronUp, FileText, ExternalLink, User } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Extraction result field with confidence */
interface ExtractedField {
    name: string;
    value: string | number | null;
    confidence: 'high' | 'medium' | 'low';
}

/** Routing candidate summary for inline display */
interface RoutingCandidateSummary {
    userId: number;
    userName: string;
    overallScore: number;
    confidence: 'high' | 'medium' | 'low';
}

/** Agent message content structure */
export interface AgentMessageContent {
    /** Type of agent response */
    type: 'extraction' | 'routing' | 'combined';
    /** Extracted work requirement fields */
    extractedFields?: ExtractedField[];
    /** Routing recommendations */
    routingCandidates?: RoutingCandidateSummary[];
    /** Draft work order link if created */
    draftWorkOrder?: {
        id: string;
        title: string;
    } | null;
    /** Agent reasoning summary */
    summary?: string;
}

interface AgentMessageProps {
    /** The agent message content */
    content: AgentMessageContent;
    /** Agent name */
    agentName?: string;
    /** Timestamp of the message */
    timestamp: string;
    /** Callback when viewing draft work order */
    onViewDraftWorkOrder?: (workOrderId: string) => void;
}

const confidenceColors: Record<string, string> = {
    high: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900',
    medium: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900',
    low: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
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

/**
 * Displays an AI agent message in a communication thread.
 * Shows structured extraction results, routing recommendations,
 * and links to draft work orders.
 */
export function AgentMessage({
    content,
    agentName = 'Dispatcher Agent',
    timestamp,
    onViewDraftWorkOrder,
}: AgentMessageProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="rounded-lg border border-purple-200/50 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 p-3 dark:border-purple-800/30 dark:from-purple-950/20 dark:to-indigo-950/20">
            {/* Header */}
            <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                        <Bot className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">{agentName}</span>
                    <Badge
                        variant="outline"
                        className="h-5 px-1.5 text-xs bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800"
                    >
                        AI
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                        {formatTimestamp(timestamp)}
                    </span>
                </div>
            </div>

            {/* Summary */}
            {content.summary && (
                <p className="mb-3 text-sm">{content.summary}</p>
            )}

            {/* Draft Work Order Link */}
            {content.draftWorkOrder && (
                <Card className="mb-3 border-dashed">
                    <CardContent className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">Draft Work Order Created</p>
                                <p className="text-xs text-muted-foreground">
                                    {content.draftWorkOrder.title}
                                </p>
                            </div>
                        </div>
                        {onViewDraftWorkOrder && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onViewDraftWorkOrder(content.draftWorkOrder!.id)}
                            >
                                <ExternalLink className="mr-2 h-3 w-3" />
                                View
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Collapsible Details */}
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="mb-2 h-7 px-2 text-xs text-muted-foreground"
                    >
                        {isExpanded ? (
                            <>
                                <ChevronUp className="mr-1 h-3 w-3" />
                                Hide details
                            </>
                        ) : (
                            <>
                                <ChevronDown className="mr-1 h-3 w-3" />
                                Show details
                            </>
                        )}
                    </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-3">
                    {/* Extracted Fields */}
                    {content.extractedFields && content.extractedFields.length > 0 && (
                        <div>
                            <h4 className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                                Extracted Information
                            </h4>
                            <div className="space-y-2">
                                {content.extractedFields.map((field) => (
                                    <div
                                        key={field.name}
                                        className="flex items-start justify-between rounded-md bg-background/50 p-2"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs text-muted-foreground capitalize">
                                                {field.name.replace(/_/g, ' ')}
                                            </p>
                                            <p className="text-sm truncate">
                                                {field.value ?? <span className="italic text-muted-foreground">Not extracted</span>}
                                            </p>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                'ml-2 shrink-0 text-xs capitalize',
                                                confidenceColors[field.confidence]
                                            )}
                                        >
                                            {field.confidence}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Routing Candidates */}
                    {content.routingCandidates && content.routingCandidates.length > 0 && (
                        <div>
                            <h4 className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                                Routing Recommendations
                            </h4>
                            <div className="space-y-2">
                                {content.routingCandidates.map((candidate, index) => (
                                    <div
                                        key={candidate.userId}
                                        className="flex items-center gap-3 rounded-md bg-background/50 p-2"
                                    >
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <User className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-sm font-medium truncate">
                                                    {candidate.userName}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold">
                                                {candidate.overallScore}%
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    'text-xs capitalize',
                                                    confidenceColors[candidate.confidence]
                                                )}
                                            >
                                                {candidate.confidence}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}
