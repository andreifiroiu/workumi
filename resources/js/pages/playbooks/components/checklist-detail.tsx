import { Badge } from '@/components/ui/badge';
import { Check, Users } from 'lucide-react';
import type { ChecklistPlaybook } from '@/types/playbooks';

interface ChecklistDetailProps {
    playbook: ChecklistPlaybook;
}

export function ChecklistDetail({ playbook }: ChecklistDetailProps) {
    const content = playbook.content;

    return (
        <div className="space-y-4">
            {content.items && content.items.length > 0 ? (
                <div className="space-y-2">
                    {content.items.map((item) => (
                        <div
                            key={item.id}
                            className="flex gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                        >
                            <div className="flex size-5 shrink-0 items-center justify-center rounded border-2 border-primary">
                                <Check className="size-3 text-primary" />
                            </div>
                            <div className="flex-1 space-y-2">
                                <p className="font-medium">{item.label}</p>
                                {item.description && (
                                    <p className="text-sm text-muted-foreground">
                                        {item.description}
                                    </p>
                                )}
                                <div className="flex flex-wrap items-center gap-2">
                                    {item.assignedRole && (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Users className="size-3" />
                                            <span>{item.assignedRole}</span>
                                        </div>
                                    )}
                                    {item.evidence && item.evidence.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {item.evidence.map((evidence, i) => (
                                                <Badge
                                                    key={i}
                                                    variant="outline"
                                                    className="text-xs"
                                                >
                                                    {evidence.type}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-lg border border-dashed p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                        No checklist items defined yet.
                    </p>
                </div>
            )}
        </div>
    );
}
