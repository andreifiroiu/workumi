import { store as storeCapture } from '@/actions/App/Http/Controllers/QuickCaptureController';
import { FormErrorSummary } from '@/components/form-error-summary';
import { AiCaptureForm } from '@/components/quick-capture/ai-capture-form';
import {
    NONE,
    QuickCaptureForm,
} from '@/components/quick-capture/quick-capture-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
    CaptureOptions,
    CaptureProposal,
    QuickCaptureFormData,
    QuickCaptureType,
} from '@/types/quick-capture';
import { useForm } from '@inertiajs/react';
import {
    Briefcase,
    CheckSquare,
    FolderKanban,
    Sparkles,
    StickyNote,
} from 'lucide-react';
import { useState } from 'react';

const CAPTURE_TYPES: Array<{
    value: QuickCaptureType;
    label: string;
    icon: typeof CheckSquare;
}> = [
    { value: 'task', label: 'Task', icon: CheckSquare },
    { value: 'work_order', label: 'Work Order', icon: Briefcase },
    { value: 'project', label: 'Project', icon: FolderKanban },
    { value: 'note', label: 'Note', icon: StickyNote },
];

/** Every key that has its own <InputError> in the form below. */
const RENDERED_FIELDS = [
    'title',
    'description',
    'partyId',
    'projectId',
    'workOrderId',
    'dueDate',
    'priority',
];

const emptyForm = (type: QuickCaptureType = 'task'): QuickCaptureFormData => ({
    type,
    title: '',
    description: '',
    partyId: '',
    projectId: type === 'note' ? NONE : '',
    workOrderId: type === 'note' ? NONE : '',
    dueDate: '',
    priority: 'medium',
});

const CONFIDENCE_LABEL: Record<string, string> = {
    high: 'High confidence',
    medium: 'Medium confidence',
    low: 'Low confidence',
};

interface QuickCapturePanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    options: CaptureOptions;
    isLoadingOptions: boolean;
    optionsError: string | null;
    /** Lets the launcher refetch the parent lists it caches. */
    onCaptureCreatedParent: () => void;
}

/**
 * The launcher remounts this on every open (see its `key`), so each capture
 * starts from the initial state and no reset effect is needed.
 */
export function QuickCapturePanel({
    open,
    onOpenChange,
    options,
    isLoadingOptions,
    optionsError,
    onCaptureCreatedParent,
}: QuickCapturePanelProps) {
    const [mode, setMode] = useState<'form' | 'ai'>('form');
    const [proposal, setProposal] = useState<CaptureProposal | null>(null);

    const form = useForm<QuickCaptureFormData>(emptyForm());
    const { setData, clearErrors, reset } = form;

    const setType = (type: QuickCaptureType) => {
        setData(emptyForm(type));
        clearErrors();
    };

    /**
     * The proposal only pre-fills the form — the user still presses Create, so a
     * wrong guess costs an edit rather than a stray record.
     */
    const applyProposal = (next: CaptureProposal) => {
        setProposal(next);
        setData({
            type: next.type,
            title: next.title,
            description: next.description ?? '',
            partyId: next.partyId ?? '',
            projectId: next.projectId ?? (next.type === 'note' ? NONE : ''),
            workOrderId: next.workOrderId ?? (next.type === 'note' ? NONE : ''),
            dueDate: next.dueDate ?? '',
            priority: next.priority ?? 'medium',
        });
        clearErrors();
        setMode('form');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        form.transform((data) => ({
            ...data,
            // The Select sentinel is a UI concern; the server expects an absent
            // parent, not the string "none".
            projectId: data.projectId === NONE ? '' : data.projectId,
            workOrderId: data.workOrderId === NONE ? '' : data.workOrderId,
        }));

        form.post(storeCapture.url(), {
            preserveScroll: true,
            onSuccess: () => {
                // A new project or work order is a parent the next capture can
                // file under, so the cached lists are no longer complete.
                if (
                    form.data.type === 'project' ||
                    form.data.type === 'work_order'
                ) {
                    onCaptureCreatedParent();
                }

                reset();
                onOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Quick capture</DialogTitle>
                        <DialogDescription>
                            Add a project, work order, task or note without
                            leaving this page.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <Tabs
                            value={mode}
                            onValueChange={(value) =>
                                setMode(value as 'form' | 'ai')
                            }
                        >
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="form">Fill in</TabsTrigger>
                                <TabsTrigger value="ai">
                                    <Sparkles className="size-3.5" />
                                    Just type it
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {mode === 'ai' ? (
                            <AiCaptureForm onProposal={applyProposal} />
                        ) : (
                            <>
                                <div
                                    className="flex flex-wrap gap-2"
                                    role="group"
                                    aria-label="What to capture"
                                >
                                    {CAPTURE_TYPES.map((captureType) => {
                                        const Icon = captureType.icon;
                                        const isSelected =
                                            form.data.type ===
                                            captureType.value;

                                        return (
                                            <Button
                                                key={captureType.value}
                                                type="button"
                                                size="sm"
                                                variant={
                                                    isSelected
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                                aria-pressed={isSelected}
                                                onClick={() =>
                                                    setType(captureType.value)
                                                }
                                            >
                                                <Icon className="size-4" />
                                                {captureType.label}
                                            </Button>
                                        );
                                    })}
                                </div>

                                {proposal && (
                                    <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="size-3.5 text-muted-foreground" />
                                            <Badge variant="secondary">
                                                {CONFIDENCE_LABEL[
                                                    proposal.confidence
                                                ] ?? proposal.confidence}
                                            </Badge>
                                        </div>
                                        {proposal.reasoning && (
                                            <p className="mt-2 text-muted-foreground">
                                                {proposal.reasoning}
                                            </p>
                                        )}
                                        {proposal.dueDateHint && (
                                            <p className="mt-2 text-foreground">
                                                Couldn't read “
                                                {proposal.dueDateHint}” as a
                                                date — pick one below if you
                                                need it.
                                            </p>
                                        )}
                                        <p className="mt-2 text-muted-foreground">
                                            Check it over, then create it.
                                        </p>
                                    </div>
                                )}

                                {optionsError && (
                                    <p
                                        className="text-sm text-destructive"
                                        role="alert"
                                    >
                                        {optionsError}
                                    </p>
                                )}

                                <FormErrorSummary
                                    errors={form.errors}
                                    rendered={RENDERED_FIELDS}
                                />

                                <QuickCaptureForm
                                    data={form.data}
                                    errors={form.errors}
                                    options={options}
                                    isLoadingOptions={isLoadingOptions}
                                    onChange={(patch) =>
                                        setData({ ...form.data, ...patch })
                                    }
                                />
                            </>
                        )}
                    </div>

                    {mode === 'form' && (
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
                                disabled={
                                    !form.data.title.trim() || form.processing
                                }
                            >
                                Create
                            </Button>
                        </DialogFooter>
                    )}
                </form>
            </DialogContent>
        </Dialog>
    );
}
