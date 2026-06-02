import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Mail, Loader2, Bot } from 'lucide-react';
import { CommunicationTypeSelector } from './CommunicationTypeSelector';
import InputError from '@/components/input-error';
import type { DraftClientUpdateButtonProps, CommunicationType } from '@/types/client-comms.d';

/**
 * DraftClientUpdateButton provides a button to trigger AI-drafted client communications.
 * Opens a dialog to select communication type and add optional notes before creating a draft.
 */
export function DraftClientUpdateButton({
    entityType,
    entityId,
    onDraftCreated,
    disabled = false,
}: DraftClientUpdateButtonProps) {
    const [dialogOpen, setDialogOpen] = useState(false);

    const form = useForm({
        entity_type: entityType,
        entity_id: entityId,
        communication_type: '' as CommunicationType | '',
        notes: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.data.communication_type) {
            return;
        }

        form.post('/client-communications/draft', {
            preserveScroll: true,
            onSuccess: () => {
                setDialogOpen(false);
                form.reset();
                onDraftCreated?.();
            },
        });
    };

    const handleOpenChange = (open: boolean) => {
        setDialogOpen(open);
        if (!open) {
            form.reset();
            form.setData({
                entity_type: entityType,
                entity_id: entityId,
                communication_type: '',
                notes: '',
            });
        }
    };

    return (
        <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    className="gap-2"
                >
                    <Mail className="h-4 w-4" />
                    Draft Client Update
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                                <Bot className="h-4 w-4" />
                            </div>
                            Draft Client Communication
                        </DialogTitle>
                        <DialogDescription>
                            AI will draft a professional communication based on the current
                            {entityType === 'project' ? ' project' : ' work order'} status.
                            You will review and approve before it is sent.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* Communication Type */}
                        <div className="grid gap-2">
                            <Label htmlFor="communication_type">
                                Communication Type <span className="text-destructive">*</span>
                            </Label>
                            <CommunicationTypeSelector
                                value={form.data.communication_type || undefined}
                                onChange={(value) => form.setData('communication_type', value)}
                                disabled={form.processing}
                            />
                            <InputError message={form.errors.communication_type} />
                        </div>

                        {/* Optional Notes */}
                        <div className="grid gap-2">
                            <Label htmlFor="notes">
                                Additional Notes{' '}
                                <span className="text-muted-foreground font-normal">(optional)</span>
                            </Label>
                            <Textarea
                                id="notes"
                                value={form.data.notes}
                                onChange={(e) => form.setData('notes', e.target.value)}
                                placeholder="Add any specific points or context for the AI to consider..."
                                rows={3}
                                className="resize-none"
                                disabled={form.processing}
                            />
                            <p className="text-xs text-muted-foreground">
                                These notes will help the AI tailor the communication to your needs.
                            </p>
                            <InputError message={form.errors.notes} />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            disabled={form.processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={form.processing || !form.data.communication_type}
                            className="gap-2"
                        >
                            {form.processing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Generating Draft...
                                </>
                            ) : (
                                <>
                                    <Bot className="h-4 w-4" />
                                    Generate Draft
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
