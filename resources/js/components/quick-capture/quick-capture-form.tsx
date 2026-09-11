import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type {
    CaptureOptions,
    QuickCaptureFormData,
    QuickCaptureType,
} from '@/types/quick-capture';

/** A Radix Select cannot hold an empty string, so "no parent" needs a sentinel. */
export const NONE = 'none';

const TITLE_LABEL: Record<QuickCaptureType, string> = {
    project: 'Project name',
    work_order: 'Work order title',
    task: 'Task title',
    note: 'Note title',
};

const BODY_LABEL: Record<QuickCaptureType, string> = {
    project: 'Description',
    work_order: 'Description',
    task: 'Description',
    note: 'Note',
};

interface QuickCaptureFormProps {
    data: QuickCaptureFormData;
    errors: Partial<Record<string, string>>;
    options: CaptureOptions;
    isLoadingOptions: boolean;
    /**
     * Takes a patch rather than a single key so one event can change several
     * fields at once: two sequential calls would both read the same render's
     * data and the later one would drop the earlier one's change.
     */
    onChange: (patch: Partial<QuickCaptureFormData>) => void;
}

export function QuickCaptureForm({
    data,
    errors,
    options,
    isLoadingOptions,
    onChange,
}: QuickCaptureFormProps) {
    const { type } = data;

    // A work order belongs to exactly one project, so picking a project narrows
    // the work order list; with no project chosen every visible one is offered.
    const workOrders =
        data.projectId && data.projectId !== NONE
            ? options.workOrders.filter(
                  (workOrder) => workOrder.projectId === data.projectId,
              )
            : options.workOrders;

    const showProject = type === 'work_order' || type === 'note';
    const showWorkOrder = type === 'task' || type === 'note';
    const showParty = type === 'project';
    const showPriority = type === 'work_order';
    const showDueDate = type !== 'note';

    return (
        <div className="grid gap-4">
            <div className="grid gap-2">
                <Label htmlFor="capture-title">{TITLE_LABEL[type]}</Label>
                <Input
                    id="capture-title"
                    value={data.title}
                    onChange={(e) => onChange({ title: e.target.value })}
                    placeholder={TITLE_LABEL[type]}
                    autoFocus
                />
                <InputError message={errors.title} />
            </div>

            {showParty && (
                <div className="grid gap-2">
                    <Label htmlFor="capture-party">Client</Label>
                    <Select
                        value={data.partyId}
                        onValueChange={(value) => onChange({ partyId: value })}
                    >
                        <SelectTrigger id="capture-party">
                            <SelectValue
                                placeholder={
                                    isLoadingOptions
                                        ? 'Loading…'
                                        : 'Select a client'
                                }
                            />
                        </SelectTrigger>
                        <SelectContent>
                            {options.parties.map((party) => (
                                <SelectItem key={party.id} value={party.id}>
                                    {party.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={errors.partyId} />
                </div>
            )}

            {showProject && (
                <div className="grid gap-2">
                    <Label htmlFor="capture-project">
                        Project{type === 'note' ? ' (optional)' : ''}
                    </Label>
                    <Select
                        value={data.projectId}
                        onValueChange={(value) =>
                            // The selected work order may not belong to the new
                            // project, so it is dropped in the same update.
                            onChange({ projectId: value, workOrderId: NONE })
                        }
                    >
                        <SelectTrigger id="capture-project">
                            <SelectValue
                                placeholder={
                                    isLoadingOptions
                                        ? 'Loading…'
                                        : 'Select a project'
                                }
                            />
                        </SelectTrigger>
                        <SelectContent>
                            {type === 'note' && (
                                <SelectItem value={NONE}>No project</SelectItem>
                            )}
                            {options.projects.map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                    {project.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={errors.projectId} />
                </div>
            )}

            {showWorkOrder && (
                <div className="grid gap-2">
                    <Label htmlFor="capture-work-order">
                        Work order{type === 'note' ? ' (optional)' : ''}
                    </Label>
                    <Select
                        value={data.workOrderId}
                        onValueChange={(value) =>
                            onChange({ workOrderId: value })
                        }
                    >
                        <SelectTrigger id="capture-work-order">
                            <SelectValue
                                placeholder={
                                    isLoadingOptions
                                        ? 'Loading…'
                                        : 'Select a work order'
                                }
                            />
                        </SelectTrigger>
                        <SelectContent>
                            {type === 'note' && (
                                <SelectItem value={NONE}>
                                    No work order
                                </SelectItem>
                            )}
                            {workOrders.map((workOrder) => (
                                <SelectItem
                                    key={workOrder.id}
                                    value={workOrder.id}
                                >
                                    {workOrder.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={errors.workOrderId} />
                </div>
            )}

            <div className="grid gap-2">
                <Label htmlFor="capture-description">{BODY_LABEL[type]}</Label>
                <Textarea
                    id="capture-description"
                    value={data.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    placeholder={
                        type === 'note'
                            ? 'Markdown is supported'
                            : 'Add any detail (optional)'
                    }
                    rows={type === 'note' ? 6 : 3}
                />
                <InputError message={errors.description} />
            </div>

            {(showDueDate || showPriority) && (
                <div className="grid gap-4 sm:grid-cols-2">
                    {showDueDate && (
                        <div className="grid gap-2">
                            <Label htmlFor="capture-due-date">
                                {type === 'project'
                                    ? 'Target end date'
                                    : 'Due date'}
                            </Label>
                            <Input
                                id="capture-due-date"
                                type="date"
                                value={data.dueDate}
                                onChange={(e) =>
                                    onChange({ dueDate: e.target.value })
                                }
                            />
                            <InputError message={errors.dueDate} />
                        </div>
                    )}

                    {showPriority && (
                        <div className="grid gap-2">
                            <Label htmlFor="capture-priority">Priority</Label>
                            <Select
                                value={data.priority}
                                onValueChange={(value) =>
                                    onChange({ priority: value })
                                }
                            >
                                <SelectTrigger id="capture-priority">
                                    <SelectValue placeholder="Medium" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">
                                        Medium
                                    </SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="urgent">
                                        Urgent
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError message={errors.priority} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
