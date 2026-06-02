import { useState, useRef, useCallback } from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { MentionInput } from './mention-input';
import { Send, Paperclip, X, Loader2, File } from 'lucide-react';
import type { MessageInputProps, MessageType } from '@/types/communications';

const MESSAGE_TYPES: Array<{ value: MessageType; label: string }> = [
    { value: 'note', label: 'Note' },
    { value: 'suggestion', label: 'Suggestion' },
    { value: 'decision', label: 'Decision' },
    { value: 'question', label: 'Question' },
    { value: 'status_update', label: 'Status Update' },
    { value: 'approval_request', label: 'Approval Request' },
    { value: 'message', label: 'Message' },
];

const MAX_FILE_SIZE_MB = 50;
const MAX_FILES = 10;
const BLOCKED_EXTENSIONS = [
    'exe', 'bat', 'cmd', 'com', 'msi', 'dll', 'scr',
    'vbs', 'vbe', 'js', 'jse', 'ws', 'wsf',
    'ps1', 'ps1xml', 'psc1', 'psd1', 'psm1',
    'sh', 'bash', 'zsh', 'csh', 'ksh',
    'app', 'dmg', 'deb', 'rpm', 'jar',
];

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function validateFile(file: File): string | null {
    // Check file size
    const maxSizeBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        return `File "${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB limit`;
    }

    // Check extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext && BLOCKED_EXTENSIONS.includes(ext)) {
        return `File type ".${ext}" is not allowed for security reasons`;
    }

    return null;
}

export function MessageInput({
    threadableType,
    threadableId,
    onMessageSent,
}: MessageInputProps) {
    const [content, setContent] = useState('');
    const [messageType, setMessageType] = useState<MessageType>('note');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setError(null);

        // Validate total count
        if (attachments.length + files.length > MAX_FILES) {
            setError(`Maximum ${MAX_FILES} files allowed`);
            return;
        }

        // Validate each file
        for (const file of files) {
            const validationError = validateFile(file);
            if (validationError) {
                setError(validationError);
                return;
            }
        }

        setAttachments((prev) => [...prev, ...files]);

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [attachments.length]);

    const handleRemoveAttachment = useCallback((index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const handleSubmit = useCallback(() => {
        if (!content.trim() && attachments.length === 0) return;

        setIsSending(true);
        setError(null);

        // Build form data
        const formData = new FormData();
        formData.append('content', content.trim() || '(attachment)');
        formData.append('type', messageType);

        attachments.forEach((file) => {
            formData.append('attachments[]', file);
        });

        // Determine the correct route path
        let routePath: string;
        switch (threadableType) {
            case 'projects':
                routePath = `/work/project/${threadableId}/communications`;
                break;
            case 'work-orders':
                routePath = `/work/work-orders/${threadableId}/communications`;
                break;
            case 'tasks':
                routePath = `/work/tasks/${threadableId}/communications`;
                break;
            default:
                routePath = `/work/${threadableType}/${threadableId}/communications`;
        }

        router.post(routePath, formData as unknown as Record<string, unknown>, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setContent('');
                setAttachments([]);
                setMessageType('note');
                onMessageSent?.();
            },
            onError: (errors) => {
                const firstError = Object.values(errors)[0];
                setError(typeof firstError === 'string' ? firstError : 'Failed to send message');
            },
            onFinish: () => {
                setIsSending(false);
            },
        });
    }, [content, messageType, attachments, threadableType, threadableId, onMessageSent]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            // Submit on Ctrl+Enter or Cmd+Enter
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
            }
        },
        [handleSubmit]
    );

    return (
        <div className="space-y-2 border-t border-border pt-4">
            {/* Error display */}
            {error && (
                <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                    {error}
                </div>
            )}

            {/* Attachments preview */}
            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {attachments.map((file, index) => (
                        <div
                            key={`${file.name}-${index}`}
                            className="flex items-center gap-2 px-2 py-1 bg-muted rounded-md text-sm"
                        >
                            <File className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate max-w-[150px]">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                                ({formatFileSize(file.size)})
                            </span>
                            <button
                                type="button"
                                onClick={() => handleRemoveAttachment(index)}
                                className="text-muted-foreground hover:text-foreground"
                                aria-label={`Remove ${file.name}`}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Message type selector and input */}
            <div className="flex gap-2">
                <Select
                    value={messageType}
                    onValueChange={(value) => setMessageType(value as MessageType)}
                >
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                        {MESSAGE_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                                {type.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="flex-1" onKeyDown={handleKeyDown}>
                    <MentionInput
                        value={content}
                        onChange={setContent}
                        placeholder="Type a message... Use @ to mention users or work items"
                        disabled={isSending}
                    />
                </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.zip,.txt"
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSending || attachments.length >= MAX_FILES}
                        aria-label="Attach files"
                    >
                        <Paperclip className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">
                        {attachments.length > 0 && `${attachments.length}/${MAX_FILES} files`}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                        Ctrl+Enter to send
                    </span>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSending || (!content.trim() && attachments.length === 0)}
                        size="sm"
                    >
                        {isSending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                        <span className="ml-2">Send</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
