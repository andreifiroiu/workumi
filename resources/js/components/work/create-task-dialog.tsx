import { store as storeTask } from '@/actions/App/Http/Controllers/Work/TaskController';
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
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DatePresetButtons } from '@/components/work/date-preset-buttons';
import { useRecentAssignees } from '@/hooks/use-recent-assignees';
import { formatLocalDate } from '@/lib/date-utils';
import { useForm } from '@inertiajs/react';
import { User } from 'lucide-react';
import { useEffect } from 'react';

/** The Select cannot hold an empty string, so "no assignee" needs a sentinel. */
const UNASSIGNED = 'unassigned';

interface CreateTaskDialogMember {
    id: string;
    name: string;
}

interface CreateTaskDialogWorkOrder {
    id: string;
    title: string;
    status: string;
}

interface CreateTaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    teamMembers: CreateTaskDialogMember[];
    /** Preselected parent work order. */
    initialWorkOrderId?: string;
    /**
     * Selectable work orders. Passing them renders the work order picker; omit
     * them when the parent is fixed, as on a work order's own page.
     */
    workOrders?: CreateTaskDialogWorkOrder[];
    /** Seed for the due date, e.g. calculateDefaultDueDate(workOrder.dueDate). */
    defaultDueDate?: string;
}

const oneWeekFromNow = (): string =>
    formatLocalDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

/** Every key that has its own <InputError> below. */
const RENDERED_FIELDS = new Set([
    'title',
    'workOrderId',
    'assignedToId',
    'dueDate',
    'estimatedHours',
    'description',
]);

/**
 * The single create-task form, shared by the Work overview and the work order
 * page so the two cannot drift apart in the fields they offer.
 */
export function CreateTaskDialog({
    open,
    onOpenChange,
    teamMembers,
    initialWorkOrderId,
    workOrders,
    defaultDueDate,
}: CreateTaskDialogProps) {
    const form = useForm({
        title: '',
        workOrderId: initialWorkOrderId ?? '',
        assignedToId: '',
        dueDate: defaultDueDate ?? oneWeekFromNow(),
        estimatedHours: '',
        description: '',
    });

    const { recentIds, recordAssignee } = useRecentAssignees();

    const { setData, clearErrors } = form;

    // Re-seed on open: the parent work order and its due date depend on which
    // row the dialog was opened from, so useForm's initial values go stale.
    useEffect(() => {
        if (!open) {
            return;
        }

        setData({
            title: '',
            workOrderId: initialWorkOrderId ?? '',
            assignedToId: '',
            dueDate: defaultDueDate ?? oneWeekFromNow(),
            estimatedHours: '',
            description: '',
        });
        clearErrors();
    }, [open, initialWorkOrderId, defaultDueDate, setData, clearErrors]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const assignedToId = form.data.assignedToId;

        form.post(storeTask.url(), {
            preserveScroll: true,
            onSuccess: () => {
                recordAssignee(assignedToId);
                onOpenChange(false);
            },
        });
    };

    // Anything the server rejected that has no field of its own — without this a
    // rejection the form cannot show looks like a button that does nothing.
    const unmappedErrors = Object.entries(form.errors)
        .filter(([field]) => !RENDERED_FIELDS.has(field))
        .map(([, message]) => message);

    const recentMembers = recentIds
        .map((id) => teamMembers.find((member) => member.id === id))
        .filter((member): member is CreateTaskDialogMember => Boolean(member))
        .filter((member) => member.id !== form.data.assignedToId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Create Task</DialogTitle>
                        <DialogDescription>
                            Create a new task for tracking individual action
                            items.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {unmappedErrors.map((message) => (
                            <InputError key={message} message={message} />
                        ))}
                        <div className="grid gap-2">
                            <Label htmlFor="task-title">Title</Label>
                            <Input
                                id="task-title"
                                value={form.data.title}
                                onChange={(e) =>
                                    form.setData('title', e.target.value)
                                }
                                placeholder="Task title"
                            />
                            <InputError message={form.errors.title} />
                        </div>
                        {workOrders && (
                            <div className="grid gap-2">
                                <Label htmlFor="task-wo">Work Order</Label>
                                <Select
                                    value={form.data.workOrderId}
                                    onValueChange={(value) =>
                                        form.setData('workOrderId', value)
                                    }
                                >
                                    <SelectTrigger id="task-wo">
                                        <SelectValue placeholder="Select a work order" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {workOrders
                                            .filter(
                                                (workOrder) =>
                                                    workOrder.status !==
                                                    'delivered',
                                            )
                                            .map((workOrder) => (
                                                <SelectItem
                                                    key={workOrder.id}
                                                    value={workOrder.id}
                                                >
                                                    {workOrder.title}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {/*
                         * Rendered outside the picker: the work order page hides
                         * the picker but can still be told its fixed work order
                         * is no longer valid (team switched, access revoked),
                         * and an error with nowhere to render reads as a dead
                         * Create button.
                         */}
                        <InputError message={form.errors.workOrderId} />
                        <div className="grid gap-2">
                            <Label htmlFor="task-assignee">Assign To</Label>
                            <Select
                                value={form.data.assignedToId || UNASSIGNED}
                                onValueChange={(value) =>
                                    form.setData(
                                        'assignedToId',
                                        value === UNASSIGNED ? '' : value,
                                    )
                                }
                            >
                                <SelectTrigger id="task-assignee">
                                    <SelectValue placeholder="Select assignee" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={UNASSIGNED}>
                                        Unassigned
                                    </SelectItem>
                                    {teamMembers.map((member) => (
                                        <SelectItem
                                            key={member.id}
                                            value={member.id}
                                        >
                                            <span className="flex items-center gap-2">
                                                <User className="h-3 w-3" />
                                                {member.name}
                                            </span>
                                        </SelectItem>
                                    ))}
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
                                                    'assignedToId',
                                                    member.id,
                                                )
                                            }
                                        >
                                            <User className="mr-1 h-3 w-3" />
                                            {member.name}
                                        </Button>
                                    ))}
                                </div>
                            )}
                            <InputError message={form.errors.assignedToId} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="task-due-date">Due Date</Label>
                            <Input
                                id="task-due-date"
                                type="date"
                                value={form.data.dueDate}
                                onChange={(e) =>
                                    form.setData('dueDate', e.target.value)
                                }
                            />
                            <DatePresetButtons
                                onSelect={(date) =>
                                    form.setData('dueDate', date)
                                }
                            />
                            <InputError message={form.errors.dueDate} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="task-estimated-hours">
                                Estimated Hours
                            </Label>
                            <Input
                                id="task-estimated-hours"
                                type="number"
                                min="0"
                                step="0.25"
                                value={form.data.estimatedHours}
                                onChange={(e) =>
                                    form.setData(
                                        'estimatedHours',
                                        e.target.value,
                                    )
                                }
                                placeholder="0"
                            />
                            <InputError message={form.errors.estimatedHours} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="task-description">
                                Description (optional)
                            </Label>
                            <Input
                                id="task-description"
                                value={form.data.description}
                                onChange={(e) =>
                                    form.setData('description', e.target.value)
                                }
                                placeholder="Brief description"
                            />
                            <InputError message={form.errors.description} />
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
                            Create Task
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
