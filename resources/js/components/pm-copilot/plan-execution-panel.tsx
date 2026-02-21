import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Bot, Check, ChevronDown, Clock, RotateCcw, Sparkles, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import type { BulkAssignment, PlanExecutionPanelProps } from '@/types/pm-copilot.d';

/**
 * Post-approval panel for assigning tasks to team members or AI agents.
 * Supports AI-powered delegation suggestions and manual assignment.
 * Uses local draft state — assignments are only persisted on "Confirm".
 */
export function PlanExecutionPanel({
    tasks,
    teamMembers,
    availableAgents,
    onConfirmAssignments,
    onDelegateAll,
    isDelegating,
    isConfirming,
    aiSuggestions,
    delegationError,
}: PlanExecutionPanelProps) {
    const [draftAssignments, setDraftAssignments] = useState<Record<string, string>>({});

    const getSuggestionForTask = (taskId: string) =>
        aiSuggestions.find((s) => s.taskId === taskId);

    // When AI suggestions arrive, populate drafts for tasks that aren't already assigned
    useEffect(() => {
        if (aiSuggestions.length === 0) {
            return;
        }

        setDraftAssignments((prev) => {
            const next = { ...prev };
            for (const suggestion of aiSuggestions) {
                const task = tasks.find((t) => t.id === suggestion.taskId);
                // Only pre-fill if the task has no existing server assignment
                if (task && !task.assignedToId && !task.assignedAgentId) {
                    next[suggestion.taskId] = `${suggestion.assigneeType}:${suggestion.assigneeId}`;
                }
            }
            return next;
        });
    }, [aiSuggestions, tasks]);

    const getServerValue = (task: PlanExecutionPanelProps['tasks'][0]): string => {
        if (task.assignedAgentId) {
            return `agent:${task.assignedAgentId}`;
        }
        if (task.assignedToId) {
            return `user:${task.assignedToId}`;
        }
        return '';
    };

    const getCurrentValue = (task: PlanExecutionPanelProps['tasks'][0]): string => {
        if (draftAssignments[task.id] !== undefined) {
            return draftAssignments[task.id];
        }
        return getServerValue(task);
    };

    const handleAssigneeChange = (taskId: string, value: string) => {
        setDraftAssignments((prev) => ({ ...prev, [taskId]: value }));
    };

    const hasPendingChanges = useMemo(() => {
        return Object.entries(draftAssignments).some(([taskId, draftValue]) => {
            const task = tasks.find((t) => t.id === taskId);
            if (!task) {
                return false;
            }
            return draftValue !== getServerValue(task);
        });
    }, [draftAssignments, tasks]);

    const handleConfirm = () => {
        const assignments: BulkAssignment[] = Object.entries(draftAssignments)
            .filter(([taskId, draftValue]) => {
                const task = tasks.find((t) => t.id === taskId);
                return task && draftValue !== getServerValue(task);
            })
            .map(([taskId, value]) => {
                const [type, id] = value.split(':') as ['user' | 'agent', string];
                return { taskId, assigneeType: type, assigneeId: id };
            });

        if (assignments.length > 0) {
            onConfirmAssignments(assignments);
        }
    };

    const handleReset = () => {
        setDraftAssignments({});
    };

    const allAssigned = useMemo(() => {
        return tasks.every((task) => {
            const current = getCurrentValue(task);
            return current !== '';
        });
    }, [tasks, draftAssignments]);

    const [isOpen, setIsOpen] = useState(!allAssigned);

    // Auto-collapse when all tasks become assigned, auto-expand when any become unassigned
    useEffect(() => {
        setIsOpen(!allAssigned);
    }, [allAssigned]);

    if (tasks.length === 0) {
        return null;
    }

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CollapsibleTrigger asChild>
                        <button type="button" className="flex items-center gap-2">
                            <Bot className="text-muted-foreground h-5 w-5" />
                            <CardTitle className="text-base">Plan Execution</CardTitle>
                            {allAssigned && (
                                <Badge variant="secondary" className="text-xs">All assigned</Badge>
                            )}
                            <ChevronDown className={`text-muted-foreground h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                    </CollapsibleTrigger>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onDelegateAll}
                        disabled={isDelegating || isConfirming}
                    >
                        <Sparkles className="mr-1.5 h-4 w-4" />
                        {isDelegating ? 'Analyzing...' : 'Delegate to AI'}
                    </Button>
                </div>
                {hasPendingChanges && (
                    <div className="flex items-center gap-2 pt-2">
                        <Button
                            variant="default"
                            size="sm"
                            onClick={handleConfirm}
                            disabled={isConfirming}
                        >
                            <Check className="mr-1.5 h-4 w-4" />
                            {isConfirming ? 'Saving...' : 'Confirm Assignments'}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReset}
                            disabled={isConfirming}
                        >
                            <RotateCcw className="mr-1.5 h-4 w-4" />
                            Reset
                        </Button>
                    </div>
                )}
            </CardHeader>
            <CollapsibleContent>
                <CardContent className="space-y-3">
                    {delegationError && (
                        <div className="text-destructive flex items-center gap-2 text-sm">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{delegationError}</span>
                        </div>
                    )}
                    <TooltipProvider>
                        {tasks.map((task) => {
                            const suggestion = getSuggestionForTask(task.id);
                            const isDraft =
                                draftAssignments[task.id] !== undefined &&
                                draftAssignments[task.id] !== getServerValue(task);

                            return (
                                <div
                                    key={task.id}
                                    className="border-border flex items-center gap-3 rounded-lg border p-3"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="text-foreground truncate text-sm font-medium"
                                                title={task.title}
                                            >
                                                {task.title}
                                            </span>
                                            {task.estimatedHours > 0 && (
                                                <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
                                                    <Clock className="h-3 w-3" />
                                                    {task.estimatedHours}h
                                                </span>
                                            )}
                                        </div>
                                        {suggestion && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Badge
                                                        variant="secondary"
                                                        className="mt-1 cursor-help text-xs"
                                                    >
                                                        <Sparkles className="mr-1 h-3 w-3" />
                                                        AI: {suggestion.assigneeName}
                                                    </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom" className="max-w-xs">
                                                    <p className="text-xs">{suggestion.reasoning}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        )}
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                        {isDraft && (
                                            <Badge variant="outline" className="text-xs">
                                                unsaved
                                            </Badge>
                                        )}
                                        <div className="w-44">
                                            <Select
                                                value={getCurrentValue(task)}
                                                onValueChange={(value) =>
                                                    handleAssigneeChange(task.id, value)
                                                }
                                                disabled={isConfirming}
                                            >
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue placeholder="Assign to..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {teamMembers.length > 0 && (
                                                        <SelectGroup>
                                                            <SelectLabel>Team Members</SelectLabel>
                                                            {teamMembers.map((member) => (
                                                                <SelectItem
                                                                    key={`user:${member.id}`}
                                                                    value={`user:${member.id}`}
                                                                >
                                                                    <span className="flex items-center gap-1.5">
                                                                        <User className="h-3 w-3" />
                                                                        {member.name}
                                                                    </span>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectGroup>
                                                    )}
                                                    {availableAgents.length > 0 && (
                                                        <SelectGroup>
                                                            <SelectLabel>AI Agents</SelectLabel>
                                                            {availableAgents.map((agent) => (
                                                                <SelectItem
                                                                    key={`agent:${agent.id}`}
                                                                    value={`agent:${agent.id}`}
                                                                >
                                                                    <span className="flex items-center gap-1.5">
                                                                        <Bot className="h-3 w-3" />
                                                                        {agent.name}
                                                                    </span>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectGroup>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </TooltipProvider>
                </CardContent>
            </CollapsibleContent>
        </Card>
        </Collapsible>
    );
}
