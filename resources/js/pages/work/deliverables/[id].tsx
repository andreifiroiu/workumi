import InputError from '@/components/input-error';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
    FilePreview,
    FilePreviewModal,
    StatusBadge,
    VersionHistoryPanel,
    VersionUploadDialog,
} from '@/components/work';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import type { Deliverable, DeliverableVersion } from '@/types/work';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Calendar,
    CheckCircle2,
    Clock,
    Edit,
    ExternalLink,
    File,
    FileSpreadsheet,
    FileText,
    History,
    Image,
    Maximize2,
    MoreVertical,
    Package,
    Plus,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import { useRef, useState } from 'react';

interface DocumentItem {
    id: string;
    name: string;
    type: string;
    fileUrl: string;
    fileSize: string;
    uploadedAt: string;
}

interface DeliverableDetailProps {
    deliverable: Deliverable & {
        projectName: string;
    };
    documents: DocumentItem[];
    versions: DeliverableVersion[];
}

export default function DeliverableDetail({
    deliverable,
    documents,
    versions,
}: DeliverableDetailProps) {
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editCriterion, setEditCriterion] = useState('');
    const [newCriterion, setNewCriterion] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewFile, setPreviewFile] = useState<DeliverableVersion | null>(
        null,
    );
    const fileInputRef = useRef<HTMLInputElement>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Work', href: '/work' },
        {
            title: deliverable.workOrderTitle,
            href: `/work/work-orders/${deliverable.workOrderId}`,
        },
        {
            title: deliverable.title,
            href: `/work/deliverables/${deliverable.id}`,
        },
    ];

    const editForm = useForm({
        title: deliverable.title,
        description: deliverable.description || '',
        type: deliverable.type,
        status: deliverable.status,
        version: deliverable.version,
        fileUrl: deliverable.fileUrl || '',
        acceptanceCriteria: deliverable.acceptanceCriteria || [],
    });

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        editForm.patch(`/work/deliverables/${deliverable.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditDialogOpen(false);
                setEditCriterion('');
            },
        });
    };

    const handleStatusChange = (status: string) => {
        router.patch(`/work/deliverables/${deliverable.id}`, { status });
    };

    const handleDelete = () => {
        router.delete(`/work/deliverables/${deliverable.id}`);
    };

    // Inline acceptance criteria management
    const handleAddCriterion = () => {
        if (!newCriterion.trim()) return;
        const updatedCriteria = [
            ...deliverable.acceptanceCriteria,
            newCriterion.trim(),
        ];
        router.patch(
            `/work/deliverables/${deliverable.id}`,
            {
                acceptanceCriteria: updatedCriteria,
            },
            {
                preserveScroll: true,
                onSuccess: () => setNewCriterion(''),
            },
        );
    };

    const handleRemoveCriterion = (index: number) => {
        const updatedCriteria = deliverable.acceptanceCriteria.filter(
            (_, i) => i !== index,
        );
        router.patch(
            `/work/deliverables/${deliverable.id}`,
            {
                acceptanceCriteria: updatedCriteria,
            },
            {
                preserveScroll: true,
            },
        );
    };

    // Edit form acceptance criteria helpers
    const addEditCriterion = () => {
        if (editCriterion.trim()) {
            editForm.setData('acceptanceCriteria', [
                ...editForm.data.acceptanceCriteria,
                editCriterion.trim(),
            ]);
            setEditCriterion('');
        }
    };

    const removeEditCriterion = (index: number) => {
        editForm.setData(
            'acceptanceCriteria',
            editForm.data.acceptanceCriteria.filter((_, i) => i !== index),
        );
    };

    // File upload handling (legacy - for documents)
    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        router.post(`/work/deliverables/${deliverable.id}/files`, formData, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => {
                setIsUploading(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            },
        });
    };

    const handleDeleteFile = (documentId: string) => {
        if (confirm('Are you sure you want to delete this file?')) {
            router.delete(
                `/work/deliverables/${deliverable.id}/files/${documentId}`,
                {
                    preserveScroll: true,
                },
            );
        }
    };

    // Version management handlers
    const handleVersionRestore = (versionId: string) => {
        router.post(
            `/work/deliverables/${deliverable.id}/versions/${versionId}/restore`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    router.reload();
                },
            },
        );
    };

    const handleVersionDelete = (versionId: string) => {
        router.delete(
            `/work/deliverables/${deliverable.id}/versions/${versionId}`,
            {
                preserveScroll: true,
                onSuccess: () => {
                    router.reload();
                },
            },
        );
    };

    const handleVersionPreview = (version: DeliverableVersion) => {
        setPreviewFile(version);
        setPreviewModalOpen(true);
    };

    const handleUploadSuccess = () => {
        router.reload();
    };

    const handleOpenPreviewModal = () => {
        if (deliverable.latestVersion) {
            setPreviewFile(deliverable.latestVersion);
            setPreviewModalOpen(true);
        }
    };

    const getFileIcon = (type: string, fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') return <FileText className="h-5 w-5 text-red-500" />;
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || ''))
            return <Image className="h-5 w-5 text-blue-500" />;
        if (['xls', 'xlsx'].includes(ext || ''))
            return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
        if (['doc', 'docx'].includes(ext || ''))
            return <FileText className="h-5 w-5 text-blue-500" />;

        switch (type) {
            case 'reference':
                return <FileText className="h-5 w-5 text-blue-500" />;
            case 'artifact':
                return <Package className="h-5 w-5 text-purple-500" />;
            case 'evidence':
                return <FileText className="h-5 w-5 text-amber-500" />;
            case 'template':
                return <FileText className="h-5 w-5 text-green-500" />;
            default:
                return <File className="h-5 w-5 text-muted-foreground" />;
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'document':
                return <FileText className="h-5 w-5" />;
            case 'design':
                return <Package className="h-5 w-5" />;
            case 'code':
                return <FileText className="h-5 w-5" />;
            default:
                return <FileText className="h-5 w-5" />;
        }
    };

    const currentVersionNumber = deliverable.latestVersion?.versionNumber ?? 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={deliverable.title} />

            <div className="flex h-full flex-1 flex-col">
                {/* Header */}
                <div className="border-b border-sidebar-border/70 px-4 py-4 sm:px-6 sm:py-6 dark:border-sidebar-border">
                    <div className="mb-4 flex flex-wrap items-center gap-3 sm:gap-4">
                        <Button variant="ghost" size="icon" asChild>
                            <Link
                                href={`/work/work-orders/${deliverable.workOrderId}`}
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span className="sr-only">
                                    Back to work order
                                </span>
                            </Link>
                        </Button>
                        <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-2 sm:gap-3">
                                <h1 className="text-2xl font-bold text-foreground">
                                    {deliverable.title}
                                </h1>
                                <StatusBadge
                                    status={deliverable.status}
                                    type="deliverable"
                                />
                                <Badge variant="outline" className="capitalize">
                                    {deliverable.type}
                                </Badge>
                            </div>
                            <p className="text-muted-foreground">
                                {deliverable.workOrderTitle}
                                {deliverable.description &&
                                    ` - ${deliverable.description}`}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {deliverable.fileUrl && (
                                <Button variant="outline" size="sm" asChild>
                                    <a
                                        href={deliverable.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <ExternalLink
                                            className="mr-2 h-4 w-4"
                                            aria-hidden="true"
                                        />
                                        View File
                                    </a>
                                </Button>
                            )}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon">
                                        <MoreVertical className="h-4 w-4" />
                                        <span className="sr-only">
                                            More actions
                                        </span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        onClick={() => setEditDialogOpen(true)}
                                    >
                                        <Edit
                                            className="mr-2 h-4 w-4"
                                            aria-hidden="true"
                                        />
                                        Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() =>
                                            setDeleteDialogOpen(true)
                                        }
                                        className="text-destructive"
                                    >
                                        <Trash2
                                            className="mr-2 h-4 w-4"
                                            aria-hidden="true"
                                        />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Deliverable Stats */}
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                        <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                            {getTypeIcon(deliverable.type)}
                            <div>
                                <div className="text-xs text-muted-foreground">
                                    Type
                                </div>
                                <div className="font-medium capitalize">
                                    {deliverable.type}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                            <Package
                                className="h-5 w-5 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <div>
                                <div className="text-xs text-muted-foreground">
                                    Current Version
                                </div>
                                <div className="font-medium">
                                    {currentVersionNumber > 0
                                        ? `v${currentVersionNumber}`
                                        : 'N/A'}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                            <History
                                className="h-5 w-5 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <div>
                                <div className="text-xs text-muted-foreground">
                                    Version Count
                                </div>
                                <div className="font-medium">
                                    {deliverable.versionCount}{' '}
                                    {deliverable.versionCount === 1
                                        ? 'version'
                                        : 'versions'}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                            <Calendar
                                className="h-5 w-5 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <div>
                                <div className="text-xs text-muted-foreground">
                                    Created
                                </div>
                                <div className="font-medium">
                                    {new Date(
                                        deliverable.createdDate,
                                    ).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                            <Clock
                                className="h-5 w-5 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <div>
                                <div className="text-xs text-muted-foreground">
                                    Delivered
                                </div>
                                <div className="font-medium">
                                    {deliverable.deliveredDate
                                        ? new Date(
                                              deliverable.deliveredDate,
                                          ).toLocaleDateString()
                                        : 'Not yet'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status Actions */}
                    <div className="mt-4 flex gap-2">
                        {deliverable.status === 'draft' && (
                            <Button
                                size="sm"
                                onClick={() => handleStatusChange('in_review')}
                            >
                                Submit for Review
                            </Button>
                        )}
                        {deliverable.status === 'in_review' && (
                            <>
                                <Button
                                    size="sm"
                                    onClick={() =>
                                        handleStatusChange('approved')
                                    }
                                >
                                    Approve
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleStatusChange('draft')}
                                >
                                    Return to Draft
                                </Button>
                            </>
                        )}
                        {deliverable.status === 'approved' && (
                            <Button
                                size="sm"
                                onClick={() => handleStatusChange('delivered')}
                            >
                                Mark as Delivered
                            </Button>
                        )}
                        {deliverable.status === 'delivered' && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange('approved')}
                            >
                                Revert to Approved
                            </Button>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Left Column - File Preview, Description & Version History */}
                        <div className="space-y-6">
                            {/* Current Version File Preview */}
                            {deliverable.latestVersion && (
                                <div>
                                    <div className="mb-4 flex items-center justify-between">
                                        <h2 className="text-lg font-bold text-foreground">
                                            Current Version Preview
                                        </h2>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleOpenPreviewModal}
                                        >
                                            <Maximize2
                                                className="mr-2 h-4 w-4"
                                                aria-hidden="true"
                                            />
                                            View Full Size
                                        </Button>
                                    </div>
                                    <div className="rounded-xl border border-border bg-card p-4">
                                        <FilePreview
                                            fileUrl={
                                                deliverable.latestVersion
                                                    .fileUrl
                                            }
                                            mimeType={
                                                deliverable.latestVersion
                                                    .mimeType
                                            }
                                            fileName={
                                                deliverable.latestVersion
                                                    .fileName
                                            }
                                            className="max-h-64"
                                        />
                                        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                                            <span>
                                                {
                                                    deliverable.latestVersion
                                                        .fileName
                                                }
                                            </span>
                                            <span>
                                                {
                                                    deliverable.latestVersion
                                                        .fileSize
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            <div>
                                <h2 className="mb-4 text-lg font-bold text-foreground">
                                    Description
                                </h2>
                                <div className="rounded-xl border border-border bg-card p-4">
                                    {deliverable.description ? (
                                        <p className="whitespace-pre-wrap text-foreground">
                                            {deliverable.description}
                                        </p>
                                    ) : (
                                        <p className="text-muted-foreground italic">
                                            No description provided
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* File URL */}
                            {deliverable.fileUrl && (
                                <div>
                                    <h3 className="mb-3 text-sm font-bold text-foreground">
                                        External Link
                                    </h3>
                                    <a
                                        href={deliverable.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-2 rounded-lg bg-muted p-3 transition-colors hover:bg-muted/80"
                                    >
                                        <ExternalLink
                                            className="h-4 w-4 text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                        <span className="truncate text-sm text-primary">
                                            {deliverable.fileUrl}
                                        </span>
                                    </a>
                                </div>
                            )}

                            {/* Version History Panel */}
                            <VersionHistoryPanel
                                deliverableId={deliverable.id}
                                versions={versions}
                                currentVersionNumber={currentVersionNumber}
                                onVersionRestore={handleVersionRestore}
                                onVersionDelete={handleVersionDelete}
                                onVersionPreview={handleVersionPreview}
                                onUploadNew={() => setUploadDialogOpen(true)}
                            />

                            {/* Files Section (Legacy Documents) */}
                            <div>
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-lg font-bold text-foreground">
                                        Additional Files ({documents.length})
                                    </h2>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleFileSelect}
                                        disabled={isUploading}
                                    >
                                        <Upload
                                            className="mr-2 h-4 w-4"
                                            aria-hidden="true"
                                        />
                                        {isUploading
                                            ? 'Uploading...'
                                            : 'Upload'}
                                    </Button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        onChange={handleFileChange}
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.zip,.txt"
                                        aria-label="Select file to upload"
                                    />
                                </div>

                                {documents.length === 0 ? (
                                    <button
                                        type="button"
                                        className="w-full cursor-pointer rounded-xl border-2 border-dashed border-border bg-muted/50 py-8 text-center transition-colors hover:bg-muted/70"
                                        onClick={handleFileSelect}
                                    >
                                        <Upload
                                            className="mx-auto mb-2 h-8 w-8 text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                        <p className="text-muted-foreground">
                                            Click to upload files or drag and
                                            drop
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            PDF, DOC, XLS, Images up to 50MB
                                        </p>
                                    </button>
                                ) : (
                                    <div className="space-y-2">
                                        {documents.map((doc) => (
                                            <div
                                                key={doc.id}
                                                className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                                            >
                                                {getFileIcon(
                                                    doc.type,
                                                    doc.name,
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <a
                                                        href={doc.fileUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="block truncate text-sm font-medium hover:text-primary"
                                                    >
                                                        {doc.name}
                                                    </a>
                                                    <div className="text-xs text-muted-foreground">
                                                        {doc.fileSize} -{' '}
                                                        {doc.uploadedAt}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        asChild
                                                    >
                                                        <a
                                                            href={doc.fileUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            aria-label={`Open ${doc.name}`}
                                                        >
                                                            <ExternalLink
                                                                className="h-4 w-4"
                                                                aria-hidden="true"
                                                            />
                                                        </a>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            handleDeleteFile(
                                                                doc.id,
                                                            )
                                                        }
                                                        className="text-destructive hover:text-destructive"
                                                        aria-label={`Delete ${doc.name}`}
                                                    >
                                                        <Trash2
                                                            className="h-4 w-4"
                                                            aria-hidden="true"
                                                        />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}

                                        <button
                                            type="button"
                                            onClick={handleFileSelect}
                                            disabled={isUploading}
                                            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-3 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                                        >
                                            <Plus
                                                className="h-4 w-4"
                                                aria-hidden="true"
                                            />
                                            Add more files
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column - Acceptance Criteria */}
                        <div>
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-foreground">
                                    Acceptance Criteria (
                                    {deliverable.acceptanceCriteria.length})
                                </h2>
                            </div>

                            {/* Add new criterion inline */}
                            <div className="mb-4 flex gap-2">
                                <Input
                                    value={newCriterion}
                                    onChange={(e) =>
                                        setNewCriterion(e.target.value)
                                    }
                                    placeholder="Add acceptance criterion..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddCriterion();
                                        }
                                    }}
                                />
                                <Button
                                    onClick={handleAddCriterion}
                                    disabled={!newCriterion.trim()}
                                >
                                    <Plus
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                    />
                                    <span className="sr-only">
                                        Add criterion
                                    </span>
                                </Button>
                            </div>

                            {deliverable.acceptanceCriteria.length === 0 ? (
                                <div className="rounded-xl bg-muted/50 py-8 text-center">
                                    <CheckCircle2
                                        className="mx-auto mb-2 h-8 w-8 text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                    <p className="text-muted-foreground">
                                        No acceptance criteria defined
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Add criteria to track deliverable
                                        requirements
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {deliverable.acceptanceCriteria.map(
                                        (criterion, index) => (
                                            <div
                                                key={index}
                                                className="group flex items-start gap-3 rounded-lg border border-border bg-card p-3"
                                            >
                                                <CheckCircle2
                                                    className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500"
                                                    aria-hidden="true"
                                                />
                                                <span className="flex-1 text-foreground">
                                                    {criterion}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                                                    onClick={() =>
                                                        handleRemoveCriterion(
                                                            index,
                                                        )
                                                    }
                                                    aria-label={`Remove criterion: ${criterion}`}
                                                >
                                                    <X
                                                        className="h-4 w-4"
                                                        aria-hidden="true"
                                                    />
                                                </Button>
                                            </div>
                                        ),
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-lg">
                    <form onSubmit={handleUpdate}>
                        <DialogHeader>
                            <DialogTitle>Edit Deliverable</DialogTitle>
                        </DialogHeader>
                        <div className="grid max-h-[60vh] gap-4 overflow-y-auto py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-title">Title</Label>
                                <Input
                                    id="edit-title"
                                    value={editForm.data.title}
                                    onChange={(e) =>
                                        editForm.setData(
                                            'title',
                                            e.target.value,
                                        )
                                    }
                                />
                                <InputError message={editForm.errors.title} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-type">Type</Label>
                                    <Select
                                        value={editForm.data.type}
                                        onValueChange={(v) =>
                                            editForm.setData(
                                                'type',
                                                v as Deliverable['type'],
                                            )
                                        }
                                    >
                                        <SelectTrigger id="edit-type">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="document">
                                                Document
                                            </SelectItem>
                                            <SelectItem value="design">
                                                Design
                                            </SelectItem>
                                            <SelectItem value="report">
                                                Report
                                            </SelectItem>
                                            <SelectItem value="code">
                                                Code
                                            </SelectItem>
                                            <SelectItem value="other">
                                                Other
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-version">
                                        Version
                                    </Label>
                                    <Input
                                        id="edit-version"
                                        value={editForm.data.version}
                                        onChange={(e) =>
                                            editForm.setData(
                                                'version',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-status">Status</Label>
                                <Select
                                    value={editForm.data.status}
                                    onValueChange={(v) =>
                                        editForm.setData(
                                            'status',
                                            v as Deliverable['status'],
                                        )
                                    }
                                >
                                    <SelectTrigger id="edit-status">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">
                                            Draft
                                        </SelectItem>
                                        <SelectItem value="in_review">
                                            In Review
                                        </SelectItem>
                                        <SelectItem value="approved">
                                            Approved
                                        </SelectItem>
                                        <SelectItem value="delivered">
                                            Delivered
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-description">
                                    Description
                                </Label>
                                <Textarea
                                    id="edit-description"
                                    value={editForm.data.description}
                                    onChange={(e) =>
                                        editForm.setData(
                                            'description',
                                            e.target.value,
                                        )
                                    }
                                    rows={3}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-file-url">
                                    External File URL
                                </Label>
                                <Input
                                    id="edit-file-url"
                                    type="url"
                                    value={editForm.data.fileUrl}
                                    onChange={(e) =>
                                        editForm.setData(
                                            'fileUrl',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="https://..."
                                />
                            </div>

                            {/* Acceptance Criteria */}
                            <div className="grid gap-2">
                                <Label htmlFor="edit-criterion">
                                    Acceptance Criteria
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="edit-criterion"
                                        value={editCriterion}
                                        onChange={(e) =>
                                            setEditCriterion(e.target.value)
                                        }
                                        placeholder="Add acceptance criterion"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addEditCriterion();
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={addEditCriterion}
                                    >
                                        <Plus
                                            className="h-4 w-4"
                                            aria-hidden="true"
                                        />
                                        <span className="sr-only">
                                            Add criterion
                                        </span>
                                    </Button>
                                </div>
                                {editForm.data.acceptanceCriteria.length >
                                    0 && (
                                    <ul className="mt-2 space-y-2">
                                        {editForm.data.acceptanceCriteria.map(
                                            (criterion, index) => (
                                                <li
                                                    key={index}
                                                    className="flex items-center gap-2 rounded-md bg-muted p-2 text-sm"
                                                >
                                                    <CheckCircle2
                                                        className="h-4 w-4 shrink-0 text-muted-foreground"
                                                        aria-hidden="true"
                                                    />
                                                    <span className="flex-1">
                                                        {criterion}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() =>
                                                            removeEditCriterion(
                                                                index,
                                                            )
                                                        }
                                                        aria-label={`Remove: ${criterion}`}
                                                    >
                                                        <X
                                                            className="h-4 w-4"
                                                            aria-hidden="true"
                                                        />
                                                    </Button>
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={editForm.processing}
                            >
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Deliverable</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{deliverable.title}
                            "? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Version Upload Dialog */}
            <VersionUploadDialog
                open={uploadDialogOpen}
                onOpenChange={setUploadDialogOpen}
                deliverableId={deliverable.id}
                onSuccess={handleUploadSuccess}
            />

            {/* File Preview Modal */}
            {previewFile && (
                <FilePreviewModal
                    open={previewModalOpen}
                    onOpenChange={setPreviewModalOpen}
                    fileUrl={previewFile.fileUrl}
                    mimeType={previewFile.mimeType}
                    fileName={previewFile.fileName}
                />
            )}
        </AppLayout>
    );
}
