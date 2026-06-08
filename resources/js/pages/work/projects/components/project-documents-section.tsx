import { DocumentPreviewWithAnnotations } from '@/components/documents/document-preview-with-annotations';
import { FolderManagement } from '@/components/documents/folder-management';
import { FolderNode } from '@/components/documents/folder-tree';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { router } from '@inertiajs/react';
import {
    ExternalLink,
    Eye,
    File,
    FileSpreadsheet,
    FileText,
    FolderOpen,
    Image,
    MoreVertical,
    Package,
    Plus,
    Settings,
    Share2,
    Trash2,
    Upload,
} from 'lucide-react';
import { useRef, useState } from 'react';

interface DocumentItem {
    id: string;
    name: string;
    type: 'reference' | 'artifact' | 'evidence' | 'template';
    fileUrl: string;
    fileSize: string | null;
    mimeType?: string;
    folderId?: string | null;
    uploadedBy?: string;
    uploadedDate?: string;
}

interface ProjectDocumentsSectionProps {
    projectId: string;
    documents: DocumentItem[];
    folders: FolderNode[];
    uploadUrl?: string;
    deleteUrlPrefix?: string;
}

export function ProjectDocumentsSection({
    projectId,
    documents,
    folders,
    uploadUrl,
    deleteUrlPrefix,
}: ProjectDocumentsSectionProps) {
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
        null,
    );
    const [isUploading, setIsUploading] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
    const [shareDoc, setShareDoc] = useState<DocumentItem | null>(null);
    const [manageFoldersOpen, setManageFoldersOpen] = useState(false);
    const [manageLinksDoc, setManageLinksDoc] = useState<DocumentItem | null>(
        null,
    );
    const [uploadFolderId, setUploadFolderId] = useState<string | undefined>(
        undefined,
    );
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filter documents by selected folder
    const filteredDocuments = selectedFolderId
        ? documents.filter((doc) => doc.folderId === selectedFolderId)
        : documents;

    const selectedFolder =
        folders.find((f) => f.id === selectedFolderId) || null;

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
        if (uploadFolderId) {
            formData.append('folder_id', uploadFolderId);
        }

        router.post(
            uploadUrl ?? `/work/projects/${projectId}/files`,
            formData,
            {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => {
                    setIsUploading(false);
                    setUploadFolderId(undefined);
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                },
            },
        );
    };

    const handleDeleteDocument = (doc: DocumentItem) => {
        if (confirm('Are you sure you want to delete this file?')) {
            router.delete(
                `${deleteUrlPrefix ?? `/work/projects/${projectId}/files`}/${doc.id}`,
                {
                    preserveScroll: true,
                },
            );
        }
    };

    // Folder CRUD handlers for project-scoped folders
    const handleCreateFolder = async (name: string, parentId?: string) => {
        return new Promise<void>((resolve, reject) => {
            router.post(
                '/folders',
                {
                    name,
                    parent_id: parentId || null,
                    project_id: projectId,
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

    const getFileIcon = (type: string, fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') return <FileText className="h-8 w-8 text-red-500" />;
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || ''))
            return <Image className="h-8 w-8 text-blue-500" />;
        if (['xls', 'xlsx'].includes(ext || ''))
            return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
        if (['doc', 'docx'].includes(ext || ''))
            return <FileText className="h-8 w-8 text-blue-500" />;

        switch (type) {
            case 'reference':
                return <FileText className="h-8 w-8 text-blue-500" />;
            case 'artifact':
                return <Package className="h-8 w-8 text-purple-500" />;
            case 'evidence':
                return <FileText className="h-8 w-8 text-amber-500" />;
            case 'template':
                return <FileText className="h-8 w-8 text-green-500" />;
            default:
                return <File className="h-8 w-8 text-muted-foreground" />;
        }
    };

    const guessMimeType = (fileName: string): string => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        const mimeTypes: Record<string, string> = {
            pdf: 'application/pdf',
            doc: 'application/msword',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            xls: 'application/vnd.ms-excel',
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            gif: 'image/gif',
            webp: 'image/webp',
            txt: 'text/plain',
            zip: 'application/zip',
        };
        return mimeTypes[ext || ''] || 'application/octet-stream';
    };

    return (
        <div className="mt-6">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">
                    Documents ({documents.length})
                </h2>
                <div className="flex items-center gap-2">
                    {folders.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setManageFoldersOpen(true)}
                            title="Manage folders"
                        >
                            <Settings className="mr-2 h-4 w-4" />
                            Folders
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
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

            {/* Folder filter (if folders exist) */}
            {folders.length > 0 && (
                <div className="mb-4 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        <Select
                            value={selectedFolderId || 'all'}
                            onValueChange={(value) =>
                                setSelectedFolderId(
                                    value === 'all' ? null : value,
                                )
                            }
                        >
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder="All documents" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All documents
                                </SelectItem>
                                {folders.map((folder) => (
                                    <SelectItem
                                        key={folder.id}
                                        value={folder.id}
                                    >
                                        {folder.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {selectedFolderId && (
                        <span className="text-sm text-muted-foreground">
                            {filteredDocuments.length} document
                            {filteredDocuments.length !== 1 ? 's' : ''} in
                            folder
                        </span>
                    )}
                </div>
            )}

            {filteredDocuments.length === 0 ? (
                <div
                    className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-muted/50 py-8 text-center transition-colors hover:bg-muted/70"
                    onClick={handleFileSelect}
                >
                    <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">
                        {selectedFolderId
                            ? 'No documents in this folder. Click to upload.'
                            : 'Click to upload files or drag and drop'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        PDF, DOC, XLS, Images up to 10MB
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredDocuments.map((doc) => (
                        <div
                            key={doc.id}
                            className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                        >
                            {getFileIcon(doc.type, doc.name)}
                            <div className="min-w-0 flex-1">
                                <button
                                    onClick={() => setPreviewDoc(doc)}
                                    className="block truncate text-left text-sm font-medium hover:text-primary"
                                >
                                    {doc.name}
                                </button>
                                <div className="text-xs text-muted-foreground">
                                    {doc.fileSize && `${doc.fileSize} • `}
                                    {doc.uploadedDate}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
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
                                                setManageLinksDoc(doc)
                                            }
                                        >
                                            <Share2 className="mr-2 h-4 w-4" />
                                            Manage share links
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() =>
                                                handleDeleteDocument(doc)
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

                    {/* Add more files button */}
                    <button
                        onClick={handleFileSelect}
                        disabled={isUploading}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-3 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                    >
                        <Plus className="h-4 w-4" />
                        Add more files
                    </button>
                </div>
            )}

            {/* Preview Dialog */}
            <Dialog
                open={!!previewDoc}
                onOpenChange={(open) => !open && setPreviewDoc(null)}
            >
                <DialogContent className="flex h-[80vh] max-w-4xl flex-col">
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
                                mimeType={
                                    previewDoc.mimeType ||
                                    guessMimeType(previewDoc.name)
                                }
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
                            Create, rename, and organize project document
                            folders
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
        </div>
    );
}
