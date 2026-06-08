import { DocumentPreviewWithAnnotations } from '@/components/documents/document-preview-with-annotations';
import { FolderManagement } from '@/components/documents/folder-management';
import { FolderNode, FolderTree } from '@/components/documents/folder-tree';
import { ShareLinkDialog } from '@/components/documents/share-link-dialog';
import { ShareLinkManagement } from '@/components/documents/share-link-management';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    ExternalLink,
    Eye,
    File,
    FileSpreadsheet,
    FileText,
    FolderTree as FolderTreeIcon,
    Image,
    MoreVertical,
    Settings,
    Share2,
    Trash2,
    Upload,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Documents', href: '/documents' },
];

interface DocumentItem {
    id: string;
    name: string;
    type: 'reference' | 'artifact' | 'evidence' | 'template';
    fileUrl: string;
    fileSize: string | null;
    mimeType: string;
    folderId: string | null;
    uploadedBy: string | null;
    uploadedDate: string;
}

interface DocumentsIndexProps {
    folders: FolderNode[];
    documents: DocumentItem[];
    selectedFolderId: string | null;
}

export default function DocumentsIndex({
    folders,
    documents,
    selectedFolderId: initialSelectedFolderId,
}: DocumentsIndexProps) {
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
        initialSelectedFolderId,
    );
    const [isUploading, setIsUploading] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
    const [shareDoc, setShareDoc] = useState<DocumentItem | null>(null);
    const [manageFoldersOpen, setManageFoldersOpen] = useState(false);
    const [manageLinksDoc, setManageLinksDoc] = useState<DocumentItem | null>(
        null,
    );
    const [folderDrawerOpen, setFolderDrawerOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const selectedFolder =
        folders.find((f) => f.id === selectedFolderId) || null;

    const handleSelectFolder = useCallback((folderId: string | null) => {
        setSelectedFolderId(folderId);
        setFolderDrawerOpen(false);
        router.get('/documents', folderId ? { folder_id: folderId } : {}, {
            preserveState: true,
            preserveScroll: true,
        });
    }, []);

    // File upload handlers
    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        if (selectedFolderId) {
            formData.append('folder_id', selectedFolderId);
        }

        router.post('/documents', formData, {
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

    const handleDeleteDocument = (doc: DocumentItem) => {
        if (confirm('Are you sure you want to delete this document?')) {
            router.delete(`/documents/${doc.id}`, {
                preserveScroll: true,
            });
        }
    };

    // Folder CRUD handlers
    const handleCreateFolder = async (name: string, parentId?: string) => {
        return new Promise<void>((resolve, reject) => {
            router.post(
                '/folders',
                {
                    name,
                    parent_id: parentId || null,
                },
                {
                    preserveScroll: true,
                    onSuccess: () => resolve(),
                    onError: () => reject(new Error('Failed to create folder')),
                },
            );
        });
    };

    const handleRenameFolder = async (folderId: string, name: string) => {
        return new Promise<void>((resolve, reject) => {
            router.patch(
                `/folders/${folderId}`,
                { name },
                {
                    preserveScroll: true,
                    onSuccess: () => resolve(),
                    onError: () => reject(new Error('Failed to rename folder')),
                },
            );
        });
    };

    const handleDeleteFolder = async (folderId: string) => {
        return new Promise<void>((resolve, reject) => {
            router.delete(`/folders/${folderId}`, {
                preserveScroll: true,
                onSuccess: () => {
                    if (selectedFolderId === folderId) {
                        setSelectedFolderId(null);
                    }
                    resolve();
                },
                onError: () => reject(new Error('Failed to delete folder')),
            });
        });
    };

    const handleMoveFolder = async (
        folderId: string,
        newParentId: string | null,
    ) => {
        return new Promise<void>((resolve, reject) => {
            router.patch(
                `/folders/${folderId}`,
                {
                    parent_id: newParentId,
                },
                {
                    preserveScroll: true,
                    onSuccess: () => resolve(),
                    onError: () => reject(new Error('Failed to move folder')),
                },
            );
        });
    };

    const getFileIcon = (mimeType: string, fileName: string) => {
        if (mimeType === 'application/pdf')
            return <FileText className="h-8 w-8 text-red-500" />;
        if (mimeType.startsWith('image/'))
            return <Image className="h-8 w-8 text-blue-500" />;
        if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))
            return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
        if (mimeType.includes('word') || mimeType.includes('document'))
            return <FileText className="h-8 w-8 text-blue-500" />;

        const ext = fileName.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') return <FileText className="h-8 w-8 text-red-500" />;
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || ''))
            return <Image className="h-8 w-8 text-blue-500" />;
        if (['xls', 'xlsx'].includes(ext || ''))
            return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
        if (['doc', 'docx'].includes(ext || ''))
            return <FileText className="h-8 w-8 text-blue-500" />;

        return <File className="h-8 w-8 text-muted-foreground" />;
    };

    const folderTreeHeader = (
        <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                Folders
            </h2>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setManageFoldersOpen(true)}
                title="Manage folders"
            >
                <Settings className="h-4 w-4" />
            </Button>
        </div>
    );

    const folderTree = (
        <FolderTree
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={handleSelectFolder}
            title=""
            showRootOption={true}
        />
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Documents" />

            <div className="flex h-full flex-1">
                {/* Sidebar with folder tree — desktop only */}
                <div className="hidden w-64 shrink-0 border-r border-sidebar-border/70 bg-sidebar p-4 md:block dark:border-sidebar-border">
                    {folderTreeHeader}
                    {folderTree}
                </div>

                {/* Folder tree drawer — mobile */}
                <Sheet
                    open={folderDrawerOpen}
                    onOpenChange={setFolderDrawerOpen}
                >
                    <SheetContent
                        side="left"
                        className="w-full max-w-xs overflow-y-auto p-4 sm:max-w-xs"
                    >
                        <SheetHeader className="p-0">
                            <SheetTitle className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                                Folders
                            </SheetTitle>
                        </SheetHeader>
                        <div className="mt-4 flex justify-end">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setFolderDrawerOpen(false);
                                    setManageFoldersOpen(true);
                                }}
                            >
                                <Settings className="mr-2 h-4 w-4" />
                                Manage
                            </Button>
                        </div>
                        <div className="mt-2">{folderTree}</div>
                    </SheetContent>
                </Sheet>

                {/* Main content */}
                <div className="flex flex-1 flex-col overflow-hidden">
                    {/* Header */}
                    <div className="border-b border-sidebar-border/70 px-4 py-4 sm:px-6 sm:py-6 dark:border-sidebar-border">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="mt-0.5 shrink-0 md:hidden"
                                    onClick={() => setFolderDrawerOpen(true)}
                                    title="Browse folders"
                                >
                                    <FolderTreeIcon className="h-4 w-4" />
                                </Button>
                                <div>
                                    <h1 className="text-2xl font-bold text-foreground">
                                        Documents
                                    </h1>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {selectedFolder
                                            ? `Viewing: ${selectedFolder.name}`
                                            : 'All team documents'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full sm:w-auto"
                                    onClick={handleFileSelect}
                                    disabled={isUploading}
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    {isUploading ? 'Uploading...' : 'Upload'}
                                </Button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileChange}
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.zip,.txt"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Document list */}
                    <div className="flex-1 overflow-auto p-4 sm:p-6">
                        {documents.length === 0 ? (
                            <div
                                className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-muted/50 py-16 text-center transition-colors hover:bg-muted/70"
                                onClick={handleFileSelect}
                            >
                                <Upload className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                                <p className="text-lg font-medium text-foreground">
                                    No documents yet
                                </p>
                                <p className="mt-1 text-muted-foreground">
                                    Click to upload files or drag and drop
                                </p>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    PDF, DOC, XLS, Images up to 10MB
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {documents.map((doc) => (
                                    <div
                                        key={doc.id}
                                        className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-shadow hover:shadow-sm"
                                    >
                                        {getFileIcon(doc.mimeType, doc.name)}
                                        <div className="min-w-0 flex-1">
                                            <button
                                                onClick={() =>
                                                    setPreviewDoc(doc)
                                                }
                                                className="block truncate text-left text-sm font-medium hover:text-primary"
                                            >
                                                {doc.name}
                                            </button>
                                            <div className="text-xs text-muted-foreground">
                                                {doc.fileSize &&
                                                    `${doc.fileSize} • `}
                                                {doc.uploadedDate}
                                                {doc.uploadedBy &&
                                                    ` • ${doc.uploadedBy}`}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    setPreviewDoc(doc)
                                                }
                                                title="Preview"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setShareDoc(doc)}
                                                title="Share"
                                            >
                                                <Share2 className="h-4 w-4" />
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                    >
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <a
                                                            href={doc.fileUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            <ExternalLink className="mr-2 h-4 w-4" />
                                                            Open in new tab
                                                        </a>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            setManageLinksDoc(
                                                                doc,
                                                            )
                                                        }
                                                    >
                                                        <Share2 className="mr-2 h-4 w-4" />
                                                        Manage share links
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            handleDeleteDocument(
                                                                doc,
                                                            )
                                                        }
                                                        className="text-destructive"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Preview Dialog */}
            <Dialog
                open={!!previewDoc}
                onOpenChange={(open) => !open && setPreviewDoc(null)}
            >
                <DialogContent className="flex h-[85vh] max-h-[85vh] w-full flex-col sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{previewDoc?.name}</DialogTitle>
                        <DialogDescription>
                            Document preview with annotations
                        </DialogDescription>
                    </DialogHeader>
                    {previewDoc && (
                        <div className="flex-1 overflow-auto">
                            <DocumentPreviewWithAnnotations
                                documentId={previewDoc.id}
                                fileUrl={previewDoc.fileUrl}
                                mimeType={previewDoc.mimeType}
                                fileName={previewDoc.name}
                                inModal={true}
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Share Link Dialog */}
            {shareDoc && (
                <ShareLinkDialog
                    documentId={shareDoc.id}
                    isOpen={!!shareDoc}
                    onOpenChange={(open) => !open && setShareDoc(null)}
                />
            )}

            {/* Manage Share Links Dialog */}
            <Dialog
                open={!!manageLinksDoc}
                onOpenChange={(open) => !open && setManageLinksDoc(null)}
            >
                <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>Manage Share Links</DialogTitle>
                        <DialogDescription>
                            View and manage share links for{' '}
                            {manageLinksDoc?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto">
                        {manageLinksDoc && (
                            <ShareLinkManagement
                                documentId={manageLinksDoc.id}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Manage Folders Dialog */}
            <Dialog
                open={manageFoldersOpen}
                onOpenChange={setManageFoldersOpen}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Manage Folders</DialogTitle>
                        <DialogDescription>
                            Create, rename, and organize your document folders
                        </DialogDescription>
                    </DialogHeader>
                    <FolderManagement
                        folders={folders}
                        selectedFolder={selectedFolder}
                        onCreateFolder={handleCreateFolder}
                        onRenameFolder={handleRenameFolder}
                        onDeleteFolder={handleDeleteFolder}
                        onMoveFolder={handleMoveFolder}
                    />
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
