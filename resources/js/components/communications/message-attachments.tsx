import {
    FileText,
    Image as ImageIcon,
    FileSpreadsheet,
    FileArchive,
    File,
    Download,
    ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MessageAttachmentsProps, MessageAttachment } from '@/types/communications';

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(mimeType: string, fileName: string) {
    const ext = fileName.split('.').pop()?.toLowerCase();

    // Image files
    if (mimeType.startsWith('image/')) {
        return <ImageIcon className="h-4 w-4 text-blue-500" />;
    }

    // PDF files
    if (mimeType === 'application/pdf' || ext === 'pdf') {
        return <FileText className="h-4 w-4 text-red-500" />;
    }

    // Spreadsheet files
    if (
        mimeType.includes('spreadsheet') ||
        mimeType.includes('excel') ||
        ['xls', 'xlsx', 'csv'].includes(ext || '')
    ) {
        return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
    }

    // Document files
    if (
        mimeType.includes('document') ||
        mimeType.includes('word') ||
        ['doc', 'docx', 'txt', 'rtf'].includes(ext || '')
    ) {
        return <FileText className="h-4 w-4 text-blue-500" />;
    }

    // Archive files
    if (
        mimeType.includes('zip') ||
        mimeType.includes('archive') ||
        ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')
    ) {
        return <FileArchive className="h-4 w-4 text-amber-500" />;
    }

    // Default file icon
    return <File className="h-4 w-4 text-muted-foreground" />;
}

function isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/');
}

interface AttachmentItemProps {
    attachment: MessageAttachment;
}

function AttachmentItem({ attachment }: AttachmentItemProps) {
    const isImage = isImageFile(attachment.mimeType);

    if (isImage) {
        return (
            <a
                href={attachment.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
            >
                <div className="relative rounded-md overflow-hidden border border-border max-w-[200px]">
                    <img
                        src={attachment.fileUrl}
                        alt={attachment.name}
                        className="w-full h-auto object-cover max-h-[150px]"
                        loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ExternalLink className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground truncate max-w-[200px]">
                    {attachment.name}
                </div>
            </a>
        );
    }

    return (
        <a
            href={attachment.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={attachment.name}
            className={cn(
                'flex items-center gap-2 p-2 rounded-md border border-border',
                'bg-muted/30 hover:bg-muted/50 transition-colors',
                'max-w-[280px]'
            )}
        >
            {getFileIcon(attachment.mimeType, attachment.name)}
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{attachment.name}</div>
                <div className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.fileSize)}
                </div>
            </div>
            <Download className="h-4 w-4 text-muted-foreground shrink-0" />
        </a>
    );
}

export function MessageAttachments({ attachments }: MessageAttachmentsProps) {
    if (attachments.length === 0) {
        return null;
    }

    const imageAttachments = attachments.filter((a) => isImageFile(a.mimeType));
    const fileAttachments = attachments.filter((a) => !isImageFile(a.mimeType));

    return (
        <div className="mt-2 space-y-2">
            {/* Image attachments in a grid */}
            {imageAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {imageAttachments.map((attachment) => (
                        <AttachmentItem key={attachment.id} attachment={attachment} />
                    ))}
                </div>
            )}

            {/* File attachments in a list */}
            {fileAttachments.length > 0 && (
                <div className="flex flex-col gap-1">
                    {fileAttachments.map((attachment) => (
                        <AttachmentItem key={attachment.id} attachment={attachment} />
                    ))}
                </div>
            )}
        </div>
    );
}
