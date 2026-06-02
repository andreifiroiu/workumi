import { useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import InputError from '@/components/input-error';
import type { WorkOrderList } from '@/types/work';

interface ConvertListToProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    list: WorkOrderList;
    parties: Array<{ id: string; name: string }>;
    defaultPartyId: string;
}

function today(): string {
    return new Date().toISOString().slice(0, 10);
}

export function ConvertListToProjectDialog({
    open,
    onOpenChange,
    list,
    parties,
    defaultPartyId,
}: ConvertListToProjectDialogProps) {
    const form = useForm({
        name: list.name,
        partyId: defaultPartyId,
        startDate: today(),
        targetEndDate: '',
    });

    // Reset the form to the list's defaults whenever the dialog is opened.
    useEffect(() => {
        if (open) {
            form.setData({
                name: list.name,
                partyId: defaultPartyId,
                startDate: today(),
                targetEndDate: '',
            });
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(`/work/work-order-lists/${list.id}/convert-to-project`, {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    const workOrderCount = list.workOrders.length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Convert List to Project</DialogTitle>
                        <DialogDescription>
                            Move the {workOrderCount} work order
                            {workOrderCount !== 1 ? 's' : ''} from &ldquo;{list.name}&rdquo; into a
                            new project. The list will be removed once converted.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="convert-name">Project name</Label>
                            <Input
                                id="convert-name"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                placeholder="New project name"
                            />
                            <InputError message={form.errors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="convert-party">Client / Party</Label>
                            <Select
                                value={form.data.partyId}
                                onValueChange={(value) => form.setData('partyId', value)}
                            >
                                <SelectTrigger id="convert-party">
                                    <SelectValue placeholder="Select a party" />
                                </SelectTrigger>
                                <SelectContent>
                                    {parties.map((party) => (
                                        <SelectItem key={party.id} value={party.id}>
                                            {party.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={form.errors.partyId} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="convert-start">Start date</Label>
                                <Input
                                    id="convert-start"
                                    type="date"
                                    value={form.data.startDate}
                                    onChange={(e) => form.setData('startDate', e.target.value)}
                                />
                                <InputError message={form.errors.startDate} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="convert-end">Target end (optional)</Label>
                                <Input
                                    id="convert-end"
                                    type="date"
                                    value={form.data.targetEndDate}
                                    onChange={(e) =>
                                        form.setData('targetEndDate', e.target.value)
                                    }
                                />
                                <InputError message={form.errors.targetEndDate} />
                            </div>
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
                            Create Project
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
