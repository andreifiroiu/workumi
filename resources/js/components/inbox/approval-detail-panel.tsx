import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { InboxItem } from '@/types/inbox';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from '@/components/ui/sheet';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
    CheckCircle,
    XCircle,
    Clock,
    Bot,
    User,
    FolderKanban,
    Briefcase,
    Calendar,
    ExternalLink,
    Archive,
} from 'lucide-react';
import { useInboxActions } from '@/hooks/use-inbox-actions';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import InputError from '@/components/input-error';

export interface ApprovalDetailPanelProps {
    /** The inbox item to display */
    item: InboxItem | null;
    /** Whether the panel is open */
    isOpen: boolean;
    /** Callback when the panel is closed */
    onClose: () => void;
}

const rejectSchema = z.object({
    feedback: z.string().min(1, 'Feedback is required').max(1000, 'Feedback must be less than 1000 characters'),
});

type RejectFormData = z.infer<typeof rejectSchema>;

/**
 * ApprovalDetailPanel displays full context for an approval item in a slide-out panel.
 * Shows source, dates, project/work order links, AI confidence, and waiting time.
 * Provides Archive, Defer, Request Changes, and Approve action buttons.
 */
export function ApprovalDetailPanel({ item, isOpen, onClose }: ApprovalDetailPanelProps) {
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const { approveItem, rejectItem, deferItem, archiveItem } = useInboxActions();

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<RejectFormData>({
        resolver: zodResolver(rejectSchema),
    });

    if (!item) return null;

    const handleApprove = () => {
        setIsApproving(true);
        approveItem(item.id);
        setIsApproving(false);
        onClose();
    };

    const handleRejectSubmit = (data: RejectFormData) => {
        setIsRejecting(true);
        rejectItem(item.id, data.feedback);
        setIsRejecting(false);
        setRejectDialogOpen(false);
        reset();
        onClose();
    };

    const handleDefer = () => {
        deferItem(item.id);
        onClose();
    };

    const handleArchive = () => {
        archiveItem(item.id);
        onClose();
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            onClose();
        }
    };

    // Type badge styling
    const typeInfo = {
        agent_draft: { label: 'Agent Draft', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
        approval: { label: 'Approval', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
        flag: { label: 'Flagged Item', color: 'bg-red-500/10 text-red-700 dark:text-red-400' },
        mention: { label: 'Mention', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400' },
        agent_workflow_approval: { label: 'Workflow Approval', color: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400' },
    };

    // AI confidence styling
    const confidenceColors = {
        high: 'text-green-600 dark:text-green-400',
        medium: 'text-amber-600 dark:text-amber-400',
        low: 'text-red-600 dark:text-red-400',
    };

    // Format the creation date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }).format(date);
    };

    return (
        <>
            <Sheet open={isOpen} onOpenChange={handleOpenChange}>
                <SheetContent
                    side="right"
                    className="w-full sm:w-[600px] sm:max-w-[600px] flex flex-col"
                >
                    {/* Header with badges */}
                    <SheetHeader className="space-y-4">
                        {/* Badge row */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                                variant="outline"
                                className={cn('text-xs', typeInfo[item.type].color)}
                            >
                                {typeInfo[item.type].label}
                            </Badge>
                            {item.urgency === 'urgent' && (
                                <Badge variant="destructive" className="text-xs font-semibold">
                                    URGENT
                                </Badge>
                            )}
                            {item.urgency === 'high' && (
                                <Badge
                                    variant="outline"
                                    className="text-xs border-orange-500 text-orange-600 dark:text-orange-400"
                                >
                                    HIGH
                                </Badge>
                            )}
                            {item.qaValidation && (
                                <Badge
                                    variant={item.qaValidation === 'passed' ? 'outline' : 'destructive'}
                                    className="text-xs"
                                >
                                    QA {item.qaValidation}
                                </Badge>
                            )}
                        </div>

                        {/* Title */}
                        <SheetTitle className="text-xl">{item.title}</SheetTitle>

                        {/* Description with metadata */}
                        <SheetDescription asChild>
                            <div className="space-y-0">
                                {/* Metadata grid */}
                                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                    {/* Source */}
                                    <div>
                                        <span className="text-muted-foreground block mb-1">Source</span>
                                        <div className="flex items-center gap-2 font-medium text-foreground">
                                            {item.sourceType === 'ai_agent' ? (
                                                <Bot className="w-4 h-4 text-blue-500" aria-hidden="true" />
                                            ) : (
                                                <User className="w-4 h-4 text-slate-500" aria-hidden="true" />
                                            )}
                                            <span>{item.sourceName}</span>
                                        </div>
                                    </div>

                                    {/* Created date */}
                                    <div>
                                        <span className="text-muted-foreground block mb-1">Created</span>
                                        <div className="flex items-center gap-2 font-medium text-foreground">
                                            <Calendar className="w-4 h-4 text-slate-500" aria-hidden="true" />
                                            <span>{formatDate(item.createdAt)}</span>
                                        </div>
                                    </div>

                                    {/* Project */}
                                    {item.relatedProjectName && (
                                        <div>
                                            <span className="text-muted-foreground block mb-1">Project</span>
                                            <div className="flex items-center gap-2 font-medium text-foreground">
                                                <FolderKanban className="w-4 h-4 text-slate-500" aria-hidden="true" />
                                                <span>{item.relatedProjectName}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Work Order */}
                                    {item.relatedWorkOrderTitle && (
                                        <div>
                                            <span className="text-muted-foreground block mb-1">Work Order</span>
                                            <a
                                                href={item.relatedWorkOrderId ? `/work/work-orders/${item.relatedWorkOrderId}` : '#'}
                                                className="flex items-center gap-2 font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                                <Briefcase className="w-4 h-4" aria-hidden="true" />
                                                <span>{item.relatedWorkOrderTitle}</span>
                                                <ExternalLink className="w-3 h-3" aria-hidden="true" />
                                            </a>
                                        </div>
                                    )}

                                    {/* AI Confidence */}
                                    {item.aiConfidence && (
                                        <div>
                                            <span className="text-muted-foreground block mb-1">AI Confidence</span>
                                            <span className={cn('font-semibold', confidenceColors[item.aiConfidence])}>
                                                {item.aiConfidence.toUpperCase()}
                                            </span>
                                        </div>
                                    )}

                                    {/* Waiting Time */}
                                    <div>
                                        <span className="text-muted-foreground block mb-1">Waiting Time</span>
                                        <div className="flex items-center gap-2 font-medium text-foreground">
                                            <Clock className="w-4 h-4 text-slate-500" aria-hidden="true" />
                                            <span>{item.waitingHours}h</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </SheetDescription>
                    </SheetHeader>

                    <Separator className="my-4" />

                    {/* Full Content */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="border border-border rounded-lg p-4 bg-muted/30">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown>{item.fullContent}</ReactMarkdown>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <SheetFooter className="mt-4 flex-row gap-3 sm:justify-start">
                        <Button
                            variant="outline"
                            onClick={handleArchive}
                            disabled={isApproving || isRejecting}
                        >
                            <Archive className="w-4 h-4 mr-2" aria-hidden="true" />
                            Archive
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleDefer}
                            disabled={isApproving || isRejecting}
                        >
                            <Clock className="w-4 h-4 mr-2" aria-hidden="true" />
                            Defer
                        </Button>
                        <div className="flex-1" />
                        <Button
                            variant="destructive"
                            onClick={() => setRejectDialogOpen(true)}
                            disabled={isApproving || isRejecting}
                        >
                            <XCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                            Request Changes
                        </Button>
                        <Button
                            variant="default"
                            onClick={handleApprove}
                            disabled={isApproving || isRejecting}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {isApproving ? (
                                <>
                                    <span className="animate-spin mr-2">...</span>
                                    Approving...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                                    Approve
                                </>
                            )}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Reject Feedback Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleSubmit(handleRejectSubmit)}>
                        <DialogHeader>
                            <DialogTitle>Request Changes</DialogTitle>
                            <DialogDescription>
                                Please provide feedback explaining why changes are needed. This comment is required.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="feedback">
                                    Feedback <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    id="feedback"
                                    {...register('feedback')}
                                    placeholder="Explain what changes are needed..."
                                    rows={4}
                                    className="resize-none"
                                    disabled={isRejecting}
                                />
                                <InputError message={errors.feedback?.message} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setRejectDialogOpen(false);
                                    reset();
                                }}
                                disabled={isRejecting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={isRejecting}
                            >
                                {isRejecting ? 'Submitting...' : 'Reject with Feedback'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
