import { Head, router } from '@inertiajs/react';
import { useState, useRef, useCallback } from 'react';
import AppLayout from '@/layouts/app-layout';
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
import { FolderTree, FolderNode } from '@/components/documents/folder-tree';
import { FolderManagement } from '@/components/documents/folder-management';
import { DocumentPreviewWithAnnotations } from '@/components/documents/document-preview-with-annotations';
import { ShareLinkDialog } from '@/components/documents/share-link-dialog';
import { ShareLinkManagement } from '@/components/documents/share-link-management';
import {
    Upload,
    FileText,
    Image,
    File,
    FileSpreadsheet,
    MoreVertical,
    Eye,
    Share2,
    Trash2,
    ExternalLink,
    Settings,
} from 'lucide-react';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Documents', href: '/documents' }];

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
        initialSelectedFolderId
    );
    const [isUploading, setIsUploading] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
    const [shareDoc, setShareDoc] = useState<DocumentItem | null>(null);
    const [manageFoldersOpen, setManageFoldersOpen] = useState(false);
    const [manageLinksDoc, setManageLinksDoc] = useState<DocumentItem | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const selectedFolder = folders.find((f) => f.id === selectedFolderId) || null;

    const handleSelectFolder = useCallback((folderId: string | null) => {
        setSelectedFolderId(folderId);
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
            router.post('/folders', {
                name,
                parent_id: parentId || null,
            }, {
                preserveScroll: true,
                onSuccess: () => resolve(),
                onError: () => reject(new Error('Failed to create folder')),
            });
        });
    };

    const handleRenameFolder = async (folderId: string, name: string) => {
        return new Promise<void>((resolve, reject) => {
            router.patch(`/folders/${folderId}`, { name }, {
                preserveScroll: true,
                onSuccess: () => resolve(),
                onError: () => reject(new Error('Failed to rename folder')),
            });
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

    const handleMoveFolder = async (folderId: string, newParentId: string | null) => {
        return new Promise<void>((resolve, reject) => {
            router.patch(`/folders/${folderId}`, {
                parent_id: newParentId,
            }, {
                preserveScroll: true,
                onSuccess: () => resolve(),
                onError: () => reject(new Error('Failed to move folder')),
            });
        });
    };

    const getFileIcon = (mimeType: string, fileName: string) => {
        if (mimeType === 'application/pdf') return <FileText className="h-8 w-8 text-red-500" />;
        if (mimeType.startsWith('image/')) return <Image className="h-8 w-8 text-blue-500" />;
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Documents" />

            <div className="flex h-full flex-1">
                {/* Sidebar with folder tree */}
                <div className="w-64 border-r border-sidebar-border/70 dark:border-sidebar-border bg-sidebar p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
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
                    <FolderTree
                        folders={folders}
                        selectedFolderId={selectedFolderId}
                        onSelectFolder={handleSelectFolder}
                        title=""
                        showRootOption={true}
                    />
                </div>

                {/* Main content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="border-b border-sidebar-border/70 dark:border-sidebar-border px-6 py-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">Documents</h1>
                                <p className="text-muted-foreground mt-1 text-sm">
                                    {selectedFolder
                                        ? `Viewing: ${selectedFolder.name}`
                                        : 'All team documents'}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleFileSelect}
                                    disabled={isUploading}
                                >
                                    <Upload className="h-4 w-4 mr-2" />
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
                    <div className="flex-1 overflow-auto p-6">
                        {documents.length === 0 ? (
                            <div
                                className="text-center py-16 bg-muted/50 rounded-xl border-2 border-dashed border-border cursor-pointer hover:bg-muted/70 transition-colors"
                                onClick={handleFileSelect}
                            >
                                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-lg font-medium text-foreground">
                                    No documents yet
                                </p>
                                <p className="text-muted-foreground mt-1">
                                    Click to upload files or drag and drop
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                    PDF, DOC, XLS, Images up to 10MB
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {documents.map((doc) => (
                                    <div
                                        key={doc.id}
                                        className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg group hover:shadow-sm transition-shadow"
                                    >
                                        {getFileIcon(doc.mimeType, doc.name)}
                                        <div className="flex-1 min-w-0">
                                            <button
                                                onClick={() => setPreviewDoc(doc)}
                                                className="font-medium text-sm truncate block hover:text-primary text-left"
                                            >
                                                {doc.name}
                                            </button>
                                            <div className="text-xs text-muted-foreground">
                                                {doc.fileSize && `${doc.fileSize} • `}
                                                {doc.uploadedDate}
                                                {doc.uploadedBy && ` • ${doc.uploadedBy}`}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setPreviewDoc(doc)}
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
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                                                            <ExternalLink className="h-4 w-4 mr-2" />
                                                            Open in new tab
                                                        </a>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setManageLinksDoc(doc)}>
                                                        <Share2 className="h-4 w-4 mr-2" />
                                                        Manage share links
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => handleDeleteDocument(doc)}
                                                        className="text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
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
            <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
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
            <Dialog open={!!manageLinksDoc} onOpenChange={(open) => !open && setManageLinksDoc(null)}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Manage Share Links</DialogTitle>
                        <DialogDescription>
                            View and manage share links for {manageLinksDoc?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto">
                        {manageLinksDoc && (
                            <ShareLinkManagement documentId={manageLinksDoc.id} />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Manage Folders Dialog */}
            <Dialog open={manageFoldersOpen} onOpenChange={setManageFoldersOpen}>
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
