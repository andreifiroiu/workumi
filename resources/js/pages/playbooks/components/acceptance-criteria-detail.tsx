import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Bot, User } from 'lucide-react';
import type { AcceptanceCriteriaPlaybook } from '@/types/playbooks';

interface AcceptanceCriteriaDetailProps {
    playbook: AcceptanceCriteriaPlaybook;
}

export function AcceptanceCriteriaDetail({ playbook }: AcceptanceCriteriaDetailProps) {
    const content = playbook.content;

    const getValidationIcon = (type: 'automated' | 'manual') => {
        return type === 'automated' ? Bot : User;
    };

    const getValidationColor = (type: 'automated' | 'manual') => {
        return type === 'automated'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
            : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400';
    };

    return (
        <div className="space-y-4">
            {content.criteria && content.criteria.length > 0 ? (
                <div className="space-y-3">
                    {content.criteria.map((criterion) => {
                        const ValidationIcon = getValidationIcon(criterion.validationType);
                        return (
                            <div
                                key={criterion.id}
                                className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
                            >
                                <div className="mb-3 flex items-start gap-3">
                                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                        <CheckCircle2 className="size-4" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium">{criterion.rule}</p>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className={`text-xs ${getValidationColor(criterion.validationType)}`}
                                    >
                                        <ValidationIcon className="mr-1 size-3" />
                                        {criterion.validationType === 'automated'
                                            ? 'Automated'
                                            : 'Manual'}
                                    </Badge>
                                </div>

                                {criterion.validationDetails && (
                                    <div className="ml-9 mt-2 rounded-md bg-muted p-2">
                                        <p className="text-xs text-muted-foreground">
                                            <span className="font-semibold">
                                                Validation Details:
                                            </span>{' '}
                                            {criterion.validationDetails}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-lg border border-dashed p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                        No acceptance criteria defined yet.
                    </p>
                </div>
            )}

            {/* Summary Stats */}
            {content.criteria && content.criteria.length > 0 && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border p-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Bot className="size-4" />
                            <span>Automated Checks</span>
                        </div>
                        <p className="mt-1 text-2xl font-semibold">
                            {
                                content.criteria.filter(
                                    (c) => c.validationType === 'automated'
                                ).length
                            }
                        </p>
                    </div>
                    <div className="rounded-lg border p-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="size-4" />
                            <span>Manual Checks</span>
                        </div>
                        <p className="mt-1 text-2xl font-semibold">
                            {
                                content.criteria.filter((c) => c.validationType === 'manual')
                                    .length
                            }
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
