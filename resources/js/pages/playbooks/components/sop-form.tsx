import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import type { InertiaFormProps } from '@inertiajs/react';
import type { SOPContent, SOPStep } from '@/types/playbooks';

interface SOPFormProps {
    form: InertiaFormProps<{
        type: string;
        name: string;
        description: string;
        content: SOPContent;
        tags: string[];
        aiGenerated: boolean;
    }>;
}

export function SOPForm({ form }: SOPFormProps) {
    const content = form.data.content as SOPContent;

    const addStep = () => {
        const newStep: SOPStep = {
            id: `step-${Date.now()}`,
            action: '',
            details: '',
            evidence: [],
            assignedRole: '',
        };
        form.setData('content', {
            ...content,
            steps: [...content.steps, newStep],
        });
    };

    const removeStep = (index: number) => {
        const updatedSteps = content.steps.filter((_, i) => i !== index);
        form.setData('content', {
            ...content,
            steps: updatedSteps,
        });
    };

    const updateStep = (index: number, field: keyof SOPStep, value: string) => {
        const updatedSteps = [...content.steps];
        updatedSteps[index] = {
            ...updatedSteps[index],
            [field]: value,
        };
        form.setData('content', {
            ...content,
            steps: updatedSteps,
        });
    };

    const addRole = (role: string) => {
        if (role.trim() && !content.rolesInvolved.includes(role.trim())) {
            form.setData('content', {
                ...content,
                rolesInvolved: [...content.rolesInvolved, role.trim()],
            });
        }
    };

    const removeRole = (role: string) => {
        form.setData('content', {
            ...content,
            rolesInvolved: content.rolesInvolved.filter((r) => r !== role),
        });
    };

    return (
        <div className="space-y-6">
            {/* Trigger Conditions */}
            <div className="space-y-2">
                <Label htmlFor="triggerConditions">Trigger Conditions</Label>
                <textarea
                    id="triggerConditions"
                    value={content.triggerConditions}
                    onChange={(e) =>
                        form.setData('content', {
                            ...content,
                            triggerConditions: e.target.value,
                        })
                    }
                    placeholder="When should this SOP be applied?"
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
            </div>

            {/* Steps */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label>Steps</Label>
                    <Button type="button" size="sm" variant="outline" onClick={addStep}>
                        <Plus className="mr-1 size-4" />
                        Add Step
                    </Button>
                </div>

                {content.steps.map((step, index) => (
                    <div key={step.id} className="rounded-lg border p-3 space-y-3">
                        <div className="flex items-start gap-2">
                            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                                {index + 1}
                            </div>
                            <div className="flex-1 space-y-3">
                                <Input
                                    placeholder="Action (e.g., Review the document)"
                                    value={step.action}
                                    onChange={(e) =>
                                        updateStep(index, 'action', e.target.value)
                                    }
                                />
                                <textarea
                                    placeholder="Details (optional)"
                                    value={step.details || ''}
                                    onChange={(e) =>
                                        updateStep(index, 'details', e.target.value)
                                    }
                                    rows={2}
                                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                                <Input
                                    placeholder="Assigned Role (optional)"
                                    value={step.assignedRole || ''}
                                    onChange={(e) =>
                                        updateStep(index, 'assignedRole', e.target.value)
                                    }
                                />
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => removeStep(index)}
                            >
                                <X className="size-4" />
                            </Button>
                        </div>
                    </div>
                ))}

                {content.steps.length === 0 && (
                    <div className="rounded-lg border border-dashed p-8 text-center">
                        <p className="text-sm text-muted-foreground">
                            No steps added yet. Click "Add Step" to get started.
                        </p>
                    </div>
                )}
            </div>

            {/* Roles Involved */}
            <div className="space-y-2">
                <Label htmlFor="roles">Roles Involved</Label>
                <div className="flex gap-2">
                    <Input
                        id="roles"
                        placeholder="Add role (e.g., Project Manager)"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addRole(e.currentTarget.value);
                                e.currentTarget.value = '';
                            }
                        }}
                    />
                </div>
                {content.rolesInvolved.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {content.rolesInvolved.map((role) => (
                            <Badge key={role} variant="secondary">
                                {role}
                                <button
                                    type="button"
                                    onClick={() => removeRole(role)}
                                    className="ml-1 hover:text-destructive"
                                >
                                    <X className="size-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}
                <p className="text-xs text-muted-foreground">
                    Press Enter to add a role
                </p>
            </div>

            {/* Estimated Time */}
            <div className="space-y-2">
                <Label htmlFor="estimatedTime">Estimated Time (minutes)</Label>
                <Input
                    id="estimatedTime"
                    type="number"
                    min="0"
                    value={content.estimatedTimeMinutes}
                    onChange={(e) =>
                        form.setData('content', {
                            ...content,
                            estimatedTimeMinutes: parseInt(e.target.value) || 0,
                        })
                    }
                    placeholder="0"
                />
            </div>

            {/* Definition of Done */}
            <div className="space-y-2">
                <Label htmlFor="definitionOfDone">Definition of Done</Label>
                <textarea
                    id="definitionOfDone"
                    value={content.definitionOfDone}
                    onChange={(e) =>
                        form.setData('content', {
                            ...content,
                            definitionOfDone: e.target.value,
                        })
                    }
                    placeholder="What does success look like?"
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
            </div>
        </div>
    );
}
