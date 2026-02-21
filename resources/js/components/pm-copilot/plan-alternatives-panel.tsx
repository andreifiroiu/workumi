import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Bot, Check, ChevronDown, ChevronUp, X, FileText, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlanAlternativesPanelProps, AIConfidence } from '@/types/pm-copilot.d';

const confidenceColors: Record<AIConfidence, string> = {
    high: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900',
    medium: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900',
    low: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
};

/**
 * Panel displaying 2-3 plan alternatives from PM Copilot.
 * Each alternative is a selectable card with confidence badge and approve/reject actions.
 */
export function PlanAlternativesPanel({
    alternatives,
    onApprove,
    onReject,
    selectedAlternativeId,
    rejectedAlternativeIds = [],
    isLoading = false,
}: PlanAlternativesPanelProps) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(
        new Set(alternatives[0] ? [alternatives[0].id] : [])
    );

    const toggleExpanded = (id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    if (alternatives.length === 0) {
        return (
            <Card>
                <CardContent className="py-8 text-center">
                    <Bot className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">
                        No plan alternatives available
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                        <Bot className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base">Plan Alternatives</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {alternatives.map((alternative, index) => {
                    const isExpanded = expandedIds.has(alternative.id);
                    const isSelected = selectedAlternativeId === alternative.id;
                    const isRejected = rejectedAlternativeIds.includes(alternative.id);

                    return (
                        <Collapsible
                            key={alternative.id}
                            open={isExpanded}
                            onOpenChange={() => toggleExpanded(alternative.id)}
                        >
                            <div
                                className={cn(
                                    'rounded-lg border transition-colors',
                                    isSelected
                                        ? 'border-primary bg-primary/5'
                                        : isRejected
                                          ? 'border-destructive/30 bg-destructive/5 opacity-60'
                                          : 'border-border hover:border-primary/50'
                                )}
                            >
                                {/* Alternative Header */}
                                <div className="flex items-center gap-3 p-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                                        {index + 1}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium truncate">
                                                {alternative.name}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    'text-xs capitalize',
                                                    confidenceColors[alternative.confidence]
                                                )}
                                            >
                                                {alternative.confidence}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                            {alternative.description}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <FileText className="h-3 w-3" />
                                                {alternative.deliverables.length}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <ListTodo className="h-3 w-3" />
                                                {alternative.tasks.length}
                                            </span>
                                        </div>

                                        <CollapsibleTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                                            >
                                                {isExpanded ? (
                                                    <ChevronUp className="h-4 w-4" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </CollapsibleTrigger>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                <CollapsibleContent>
                                    <div className="border-t border-border px-3 pb-3 pt-3">
                                        {/* Deliverables Preview */}
                                        {alternative.deliverables.length > 0 && (
                                            <div className="mb-3">
                                                <h4 className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                                                    Deliverables
                                                </h4>
                                                <ul className="space-y-1">
                                                    {alternative.deliverables.map((deliverable) => (
                                                        <li
                                                            key={deliverable.id}
                                                            className="flex items-center gap-2 text-sm"
                                                        >
                                                            <FileText className="h-3 w-3 text-muted-foreground" />
                                                            <span>{deliverable.title}</span>
                                                            <Badge
                                                                variant="secondary"
                                                                className="h-5 px-1.5 text-xs capitalize"
                                                            >
                                                                {deliverable.type}
                                                            </Badge>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Tasks Preview */}
                                        {alternative.tasks.length > 0 && (
                                            <div className="mb-3">
                                                <h4 className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                                                    Tasks
                                                </h4>
                                                <ul className="space-y-1">
                                                    {alternative.tasks.map((task) => (
                                                        <li
                                                            key={task.id}
                                                            className="flex items-center justify-between text-sm"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <ListTodo className="h-3 w-3 text-muted-foreground" />
                                                                <span>{task.title}</span>
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">
                                                                {task.estimatedHours}h
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => onApprove(alternative.id)}
                                                disabled={isLoading || isSelected || isRejected}
                                                className="flex-1"
                                                variant={isSelected ? 'secondary' : 'default'}
                                                aria-label={`Approve ${alternative.name}`}
                                            >
                                                {isSelected ? (
                                                    <>
                                                        <Check className="mr-2 h-4 w-4" />
                                                        Approved
                                                    </>
                                                ) : (
                                                    <>
                                                        <Check className="mr-2 h-4 w-4" />
                                                        Approve
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                onClick={() => onReject(alternative.id, undefined)}
                                                disabled={isLoading || isSelected || isRejected}
                                                variant={isRejected ? 'destructive' : 'outline'}
                                                className="flex-1"
                                                aria-label={`Reject ${alternative.name}`}
                                            >
                                                <X className="mr-2 h-4 w-4" />
                                                {isRejected ? 'Rejected' : 'Reject'}
                                            </Button>
                                        </div>
                                    </div>
                                </CollapsibleContent>
                            </div>
                        </Collapsible>
                    );
                })}
            </CardContent>
        </Card>
    );
}
