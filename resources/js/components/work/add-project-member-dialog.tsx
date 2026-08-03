import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { getInitials } from '@/components/workflow/raci-selector';
import { cn } from '@/lib/utils';
import type { ProjectAssignableUser } from '@/types/work';
import { router } from '@inertiajs/react';
import { ChevronDown, X } from 'lucide-react';
import { useState } from 'react';
import ProjectMemberController from '@/actions/App/Http/Controllers/Work/ProjectMemberController';

interface AddProjectMemberDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    /** Team members not already on the project. */
    candidates: ProjectAssignableUser[];
}

export function AddProjectMemberDialog({
    open,
    onOpenChange,
    projectId,
    candidates,
}: AddProjectMemberDialogProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const selected = candidates.filter((user) => selectedIds.includes(user.id));

    const reset = () => {
        setSelectedIds([]);
        setErrors({});
        setPickerOpen(false);
    };

    const handleOpenChange = (next: boolean) => {
        if (isSubmitting) {
            return;
        }
        if (!next) {
            reset();
        }
        onOpenChange(next);
    };

    const toggle = (userId: string) => {
        setSelectedIds((current) =>
            current.includes(userId)
                ? current.filter((id) => id !== userId)
                : [...current, userId],
        );
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        if (selectedIds.length === 0) {
            return;
        }

        setIsSubmitting(true);
        setErrors({});

        router.post(
            ProjectMemberController.store.url({ project: Number(projectId) }),
            { user_ids: selectedIds.map(Number) },
            {
                preserveScroll: true,
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
                onError: (formErrors) => setErrors(formErrors),
                onFinish: () => setIsSubmitting(false),
            },
        );
    };

    // Laravel reports per-index errors like "user_ids.0"; surface whichever came back.
    const selectionError =
        errors.user_ids ??
        Object.entries(errors).find(([key]) =>
            key.startsWith('user_ids.'),
        )?.[1];

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add people to this project</DialogTitle>
                        <DialogDescription>
                            They will be able to open this private project and
                            everything inside it, without being assigned a RACI
                            role.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 py-4">
                        <Label>Team members</Label>
                        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={pickerOpen}
                                    aria-label="Select team members"
                                    data-testid="project-member-picker-trigger"
                                    className={cn(
                                        'h-auto min-h-9 w-full justify-between font-normal',
                                        selected.length === 0 &&
                                            'text-muted-foreground',
                                    )}
                                    disabled={
                                        isSubmitting || candidates.length === 0
                                    }
                                >
                                    {selected.length > 0 ? (
                                        <div className="flex flex-wrap gap-1 py-0.5">
                                            {selected.slice(0, 3).map((user) => (
                                                <Badge
                                                    key={user.id}
                                                    variant="secondary"
                                                    className="flex items-center gap-1 pr-1"
                                                >
                                                    <span className="max-w-[100px] truncate">
                                                        {user.name}
                                                    </span>
                                                    <span
                                                        role="button"
                                                        tabIndex={-1}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggle(user.id);
                                                        }}
                                                        className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                                                        aria-label={`Remove ${user.name}`}
                                                    >
                                                        <X className="size-3" />
                                                    </span>
                                                </Badge>
                                            ))}
                                            {selected.length > 3 && (
                                                <Badge variant="secondary">
                                                    +{selected.length - 3}
                                                </Badge>
                                            )}
                                        </div>
                                    ) : (
                                        <span>
                                            {candidates.length === 0
                                                ? 'Everyone on the team is already here'
                                                : 'Select people...'}
                                        </span>
                                    )}
                                    <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-[min(320px,calc(100vw-2rem))] p-0"
                                align="start"
                            >
                                <div className="max-h-[300px] overflow-y-auto p-2">
                                    <div className="space-y-1">
                                        {candidates.map((user) => {
                                            const isChecked =
                                                selectedIds.includes(user.id);
                                            return (
                                                <label
                                                    key={user.id}
                                                    className={cn(
                                                        'flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-accent',
                                                        isChecked &&
                                                            'bg-accent/50',
                                                    )}
                                                >
                                                    <Checkbox
                                                        checked={isChecked}
                                                        onCheckedChange={() =>
                                                            toggle(user.id)
                                                        }
                                                        aria-label={user.name}
                                                    />
                                                    <Avatar className="size-7">
                                                        <AvatarImage
                                                            src={
                                                                user.avatarUrl ??
                                                                undefined
                                                            }
                                                            alt={user.name}
                                                        />
                                                        <AvatarFallback className="text-[10px]">
                                                            {getInitials(
                                                                user.name,
                                                            )}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm">
                                                            {user.name}
                                                        </div>
                                                        <div className="truncate text-xs text-muted-foreground">
                                                            {user.email}
                                                        </div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <InputError message={selectionError} />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || selectedIds.length === 0}
                        >
                            {isSubmitting ? 'Adding...' : 'Add to project'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
