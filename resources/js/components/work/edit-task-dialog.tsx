import { FormErrorSummary } from '@/components/form-error-summary';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DatePresetButtons } from '@/components/work/date-preset-buttons';
import { useRecentAssignees } from '@/hooks/use-recent-assignees';
import { useForm } from '@inertiajs/react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Bot, User } from 'lucide-react';
import { useEffect } from 'react';

/** The Select cannot hold an empty string, so "no assignee" needs a sentinel. */
const UNASSIGNED = 'unassigned';

/**
 * Every key that has its own <InputError> below. The endpoint also rejects
 * assignedToId, assignedAgentId, dueDate and estimatedHours, and an error with
 * nowhere to render reads as a Save button that silently does nothing.
 */
const RENDERED_FIELDS = ['title'];

interface EditTaskDialogMember {
    id: string;
    name: string;
}

/** The task fields this dialog edits, as both callers already expose them. */
export interface EditTaskDialogTask {
    id: string;
    title: string;
    description: string | null;
    assignedToId: string | null;
    assignedAgentId: string | null;
    dueDate: string | null;
    estimatedHours: number;
}

interface EditTaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: EditTaskDialogTask;
    teamMembers: EditTaskDialogMember[];
    availableAgents?: EditTaskDialogMember[];
}

/**
 * Users and AI agents share one picker, so the selected value carries its own
 * kind: 'user:{id}', 'agent:{id}', or the unassigned sentinel.
 */
const assignmentOf = (task: EditTaskDialogTask): string => {
    if (task.assignedToId) {
        return `user:${task.assignedToId}`;
    }
    if (task.assignedAgentId) {
        return `agent:${task.assignedAgentId}`;
    }

    return UNASSIGNED;
};

/** The user half of a picker value, or null when it names an agent or nobody. */
const userIdOf = (assignment: string): string | null =>
    assignment.startsWith('user:') ? assignment.replace('user:', '') : null;

/** The agent half of a picker value. */
const agentIdOf = (assignment: string): string | null =>
    assignment.startsWith('agent:') ? assignment.replace('agent:', '') : null;

const formValuesOf = (task: EditTaskDialogTask) => ({
    title: task.title,
    description: task.description || '',
    assignment: assignmentOf(task),
    due_date: task.dueDate || '',
    estimated_hours: task.estimatedHours.toString(),
    reason: '',
});

/**
 * The single edit-task form, shared by the task page and the work order's task
 * list so the two cannot drift apart in the fields they offer.
 */
export function EditTaskDialog({
    open,
    onOpenChange,
    task,
    teamMembers,
    availableAgents = [],
}: EditTaskDialogProps) {
    const form = useForm(formValuesOf(task));
    const { recentIds: recentAssigneeIds, recordAssignee } =
        useRecentAssignees();

    const { setData, clearErrors } = form;

    // Re-seed on open: the dialog outlives the task it was opened for (the work
    // order page reuses it across rows), so useForm's initial values go stale.
    //
    // Keyed on the id, not the task object: a rejected save re-renders the page
    // with fresh props while the dialog stays open, and a new object identity
    // would re-run this and wipe what the user was in the middle of typing.
    useEffect(() => {
        if (!open) {
            return;
        }

        setData(formValuesOf(task));
        clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- see above: the id, not the object
    }, [open, task.id, setData, clearErrors]);

    // The reason field is only relevant once the user actually edits the due date.
    const dueDateChanged = form.data.due_date !== (task.dueDate || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const assignedToId = userIdOf(form.data.assignment);

        // Reads only from the data it is handed: useForm keeps the last
        // transform forever, so one that closed over values computed out here
        // would quietly resend them from any future submit.
        form.transform((data) => ({
            title: data.title,
            description: data.description,
            // The picker holds one combined value; the endpoint wants two fields.
            assignedToId: userIdOf(data.assignment),
            assignedAgentId: agentIdOf(data.assignment),
            dueDate: data.due_date,
            estimatedHours: data.estimated_hours,
            reason:
                data.due_date !== (task.dueDate || '')
                    ? data.reason || null
                    : null,
        }));

        form.patch(`/work/tasks/${task.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                form.setData('reason', '');
                recordAssignee(assignedToId);
                onOpenChange(false);
            },
        });
    };

    const recentMembers = recentAssigneeIds
        .map((id) => teamMembers.find((member) => member.id === id))
        .filter((member): member is EditTaskDialogMember => Boolean(member))
        .filter((member) => `user:${member.id}` !== form.data.assignment);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Edit Task</DialogTitle>
                        <VisuallyHidden>
                            <DialogDescription>
                                Update task details including title, assignment,
                                and due date
                            </DialogDescription>
                        </VisuallyHidden>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <FormErrorSummary
                            errors={form.errors}
                            rendered={RENDERED_FIELDS}
                        />
                        <div className="grid gap-2">
                            <Label htmlFor="edit-task-title">Title</Label>
                            <Input
                                id="edit-task-title"
                                value={form.data.title}
                                onChange={(e) =>
                                    form.setData('title', e.target.value)
                                }
                            />
                            <InputError message={form.errors.title} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-task-assignee">
                                    Assigned To
                                </Label>
                                <Select
                                    value={form.data.assignment}
                                    onValueChange={(value) =>
                                        form.setData('assignment', value)
                                    }
                                >
                                    <SelectTrigger id="edit-task-assignee">
                                        <SelectValue placeholder="Unassigned" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={UNASSIGNED}>
                                            <span className="text-muted-foreground">
                                                Unassigned
                                            </span>
                                        </SelectItem>
                                        <SelectGroup>
                                            <SelectLabel className="flex items-center gap-2">
                                                <User className="h-3 w-3" />
                                                Team Members
                                            </SelectLabel>
                                            {teamMembers.map((member) => (
                                                <SelectItem
                                                    key={`user:${member.id}`}
                                                    value={`user:${member.id}`}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <User className="h-3 w-3" />
                                                        {member.name}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                        {availableAgents.length > 0 && (
                                            <SelectGroup>
                                                <SelectLabel className="flex items-center gap-2">
                                                    <Bot className="h-3 w-3" />
                                                    AI Agents
                                                </SelectLabel>
                                                {availableAgents.map(
                                                    (agent) => (
                                                        <SelectItem
                                                            key={`agent:${agent.id}`}
                                                            value={`agent:${agent.id}`}
                                                        >
                                                            <span className="flex items-center gap-2">
                                                                <Bot className="h-3 w-3" />
                                                                {agent.name}
                                                            </span>
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectGroup>
                                        )}
                                    </SelectContent>
                                </Select>
                                {recentMembers.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {recentMembers.map((member) => (
                                            <Button
                                                key={member.id}
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-6 text-xs"
                                                onClick={() =>
                                                    form.setData(
                                                        'assignment',
                                                        `user:${member.id}`,
                                                    )
                                                }
                                            >
                                                <User className="mr-1 h-3 w-3" />
                                                {member.name}
                                            </Button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-task-estimated-hours">
                                    Estimated Hours
                                </Label>
                                <Input
                                    id="edit-task-estimated-hours"
                                    type="number"
                                    min="0"
                                    step="0.25"
                                    value={form.data.estimated_hours}
                                    onChange={(e) =>
                                        form.setData(
                                            'estimated_hours',
                                            e.target.value,
                                        )
                                    }
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-task-due-date">Due Date</Label>
                            <Input
                                id="edit-task-due-date"
                                type="date"
                                value={form.data.due_date}
                                onChange={(e) =>
                                    form.setData('due_date', e.target.value)
                                }
                            />
                            <DatePresetButtons
                                onSelect={(date) =>
                                    form.setData('due_date', date)
                                }
                            />
                        </div>
                        {dueDateChanged && (
                            <div className="grid gap-2">
                                <Label htmlFor="edit-task-due-date-reason">
                                    Reason for due date change (optional)
                                </Label>
                                <Input
                                    id="edit-task-due-date-reason"
                                    placeholder="e.g. waiting on client assets"
                                    value={form.data.reason}
                                    onChange={(e) =>
                                        form.setData('reason', e.target.value)
                                    }
                                />
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="edit-task-description">
                                Description
                            </Label>
                            <Input
                                id="edit-task-description"
                                value={form.data.description}
                                onChange={(e) =>
                                    form.setData('description', e.target.value)
                                }
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            Save
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
