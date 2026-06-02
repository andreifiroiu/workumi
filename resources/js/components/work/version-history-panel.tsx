import { cn } from '@/lib/utils';
import {
    ChevronDown,
    ChevronUp,
    Download,
    Eye,
    History,
    Plus,
    RotateCcw,
    Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';

export interface DeliverableVersion {
    id: string;
    versionNumber: number;
    fileUrl: string;
    fileName: string;
    fileSize: string;
    mimeType: string;
    notes: string | null;
    uploadedBy: { id: string; name: string } | null;
    createdAt: string;
}

interface VersionHistoryPanelProps {
    deliverableId: string;
    versions: DeliverableVersion[];
    currentVersionNumber: number;
    onVersionRestore: (versionId: string) => void;
    onVersionDelete: (versionId: string) => void;
    onVersionPreview?: (version: DeliverableVersion) => void;
    onUploadNew?: () => void;
    className?: string;
}

export function VersionHistoryPanel({
    versions,
    currentVersionNumber,
    onVersionRestore,
    onVersionDelete,
    onVersionPreview,
    onUploadNew,
    className,
}: VersionHistoryPanelProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const handleDelete = (versionId: string) => {
        if (deleteConfirmId === versionId) {
            onVersionDelete(versionId);
            setDeleteConfirmId(null);
        } else {
            setDeleteConfirmId(versionId);
        }
    };

    const handleCancelDelete = () => {
        setDeleteConfirmId(null);
    };

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn('', className)}>
            <div className="flex items-center justify-between rounded-t-lg border border-border bg-card p-4">
                <CollapsibleTrigger asChild>
                    <button
                        type="button"
                        className="flex items-center gap-2 text-left hover:text-primary"
                        aria-expanded={isOpen}
                    >
                        <History className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                        <h3 className="font-semibold text-foreground">
                            Version History ({versions.length})
                        </h3>
                        {isOpen ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        )}
                    </button>
                </CollapsibleTrigger>
                {onUploadNew && (
                    <Button variant="outline" size="sm" onClick={onUploadNew}>
                        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                        Upload New Version
                    </Button>
                )}
            </div>

            <CollapsibleContent>
                <div
                    className="divide-y divide-border rounded-b-lg border border-t-0 border-border bg-card"
                    data-testid="version-history-list"
                >
                    {versions.length === 0 ? (
                        <div className="p-6 text-center">
                            <History className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
                            <p className="mt-2 text-muted-foreground">No versions yet</p>
                            {onUploadNew && (
                                <Button variant="outline" size="sm" onClick={onUploadNew} className="mt-4">
                                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                                    Upload First Version
                                </Button>
                            )}
                        </div>
                    ) : (
                        versions.map((version) => {
                            const isLatest = version.versionNumber === currentVersionNumber;
                            const isDeleting = deleteConfirmId === version.id;

                            return (
                                <div
                                    key={version.id}
                                    className={cn(
                                        'group p-4 transition-colors hover:bg-muted/50',
                                        isLatest && 'bg-primary/5'
                                    )}
                                    data-testid={`version-row-${version.id}`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-foreground">
                                                    v{version.versionNumber}
                                                </span>
                                                {isLatest && (
                                                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                                                        Current
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="truncate text-sm text-foreground">
                                                {version.fileName}
                                            </p>
                                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                <span>{version.fileSize}</span>
                                                <span>{formatDate(version.createdAt)}</span>
                                                {version.uploadedBy && (
                                                    <span>by {version.uploadedBy.name}</span>
                                                )}
                                            </div>
                                            {version.notes && (
                                                <p className="mt-2 text-sm text-muted-foreground italic">
                                                    {version.notes}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                            {isDeleting ? (
                                                <>
                                                    <span className="mr-2 text-sm text-destructive">
                                                        Confirm delete?
                                                    </span>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleDelete(version.id)}
                                                    >
                                                        Yes
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleCancelDelete}
                                                    >
                                                        No
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    {onVersionPreview && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => onVersionPreview(version)}
                                                            aria-label={`Preview version ${version.versionNumber}`}
                                                        >
                                                            <Eye className="h-4 w-4" aria-hidden="true" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        asChild
                                                    >
                                                        <a
                                                            href={version.fileUrl}
                                                            download={version.fileName}
                                                            aria-label={`Download version ${version.versionNumber}`}
                                                        >
                                                            <Download className="h-4 w-4" aria-hidden="true" />
                                                        </a>
                                                    </Button>
                                                    {!isLatest && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => onVersionRestore(version.id)}
                                                            aria-label={`Restore version ${version.versionNumber}`}
                                                        >
                                                            <RotateCcw className="h-4 w-4" aria-hidden="true" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(version.id)}
                                                        className="text-destructive hover:text-destructive"
                                                        aria-label={`Delete version ${version.versionNumber}`}
                                                    >
                                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}
