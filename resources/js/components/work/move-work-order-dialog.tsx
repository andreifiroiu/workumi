import { move as moveWorkOrder } from '@/actions/App/Http/Controllers/Work/WorkOrderController';
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
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { MoveDestinationProject } from '@/types/work';
import { useForm } from '@inertiajs/react';
import { Lock } from 'lucide-react';
import { useEffect } from 'react';

/** The Select cannot hold an empty string, so "no list" needs a sentinel. */
const UNGROUPED = 'ungrouped';

/** Every key that has its own <InputError> below. */
const RENDERED_FIELDS = ['projectId', 'workOrderListId'];

interface MoveWorkOrderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workOrder: { id: string; title: string };
    /** Left out of the picker — the work order is already here. */
    currentProjectId: string;
    destinations: MoveDestinationProject[];
}

/**
 * Moves a work order to another project, taking its tasks and deliverables with
 * it. Shared by the work order page, the project page and the all-projects tree.
 */
export function MoveWorkOrderDialog({
    open,
    onOpenChange,
    workOrder,
    currentProjectId,
    destinations,
}: MoveWorkOrderDialogProps) {
    const form = useForm({ projectId: '', workOrderListId: UNGROUPED });

    const { setData, clearErrors } = form;

    // Re-seed on open: one instance serves every row of a list, so useForm's
    // initial values go stale the moment another row is opened.
    useEffect(() => {
        if (!open) {
            return;
        }

        setData({ projectId: '', workOrderListId: UNGROUPED });
        clearErrors();
    }, [open, workOrder.id, setData, clearErrors]);

    const candidates = destinations.filter(
        (project) => project.id !== currentProjectId,
    );
    const selected = candidates.find(
        (project) => project.id === form.data.projectId,
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        form.transform((data) => ({
            projectId: data.projectId,
            // The sentinel is a display concern; the endpoint wants no list.
            workOrderListId:
                data.workOrderListId === UNGROUPED ? '' : data.workOrderListId,
        }));

        form.post(moveWorkOrder.url({ workOrder: Number(workOrder.id) }), {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Move Work Order</DialogTitle>
                        <DialogDescription>
                            Move "{workOrder.title}" to another project. Its
                            tasks and deliverables move with it, and its client
                            contact follows the destination project.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <FormErrorSummary
                            errors={form.errors}
                            rendered={RENDERED_FIELDS}
                        />
                        {candidates.length === 0 && (
                            // An empty picker above a permanently disabled Move
                            // button reads as a broken dialog.
                            <p className="text-sm text-muted-foreground">
                                There is no other project you can move this work
                                order into.
                            </p>
                        )}
                        <div
                            className="grid gap-2"
                            hidden={candidates.length === 0}
                        >
                            <Label htmlFor="move-project">Project</Label>
                            <Select
                                value={form.data.projectId}
                                onValueChange={(value) =>
                                    // The current list cannot exist in the new
                                    // project, so the choice resets with it.
                                    setData({
                                        projectId: value,
                                        workOrderListId: UNGROUPED,
                                    })
                                }
                            >
                                <SelectTrigger id="move-project">
                                    <SelectValue placeholder="Select a project" />
                                </SelectTrigger>
                                <SelectContent>
                                    {candidates.map((project) => (
                                        <SelectItem
                                            key={project.id}
                                            value={project.id}
                                        >
                                            <span className="flex items-center gap-2">
                                                {project.isPrivate && (
                                                    <Lock className="h-3 w-3" />
                                                )}
                                                {project.name}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={form.errors.projectId} />
                        </div>
                        {selected && selected.lists.length > 0 && (
                            <div className="grid gap-2">
                                <Label htmlFor="move-list">List</Label>
                                <Select
                                    value={form.data.workOrderListId}
                                    onValueChange={(value) =>
                                        setData('workOrderListId', value)
                                    }
                                >
                                    <SelectTrigger id="move-list">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={UNGROUPED}>
                                            <span className="text-muted-foreground">
                                                Ungrouped
                                            </span>
                                        </SelectItem>
                                        {selected.lists.map((list) => (
                                            <SelectItem
                                                key={list.id}
                                                value={list.id}
                                            >
                                                {list.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {/*
                         * Rendered outside the list picker: that picker is
                         * hidden for a project with no lists, and an error with
                         * nowhere to render reads as a dead Move button.
                         */}
                        <InputError message={form.errors.workOrderListId} />
                        {selected?.isPrivate && (
                            <p className="text-sm text-muted-foreground">
                                {selected.name} is private. Teammates without
                                access to it will lose sight of this work order
                                unless they hold a role on it.
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={form.processing || !form.data.projectId}
                        >
                            Move
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
