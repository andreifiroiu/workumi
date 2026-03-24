import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { FilePreview } from '@/components/work/file-preview';
import { cn } from '@/lib/utils';
import { Download, Lock, AlertTriangle, FileWarning } from 'lucide-react';
import type { SharedDocumentPageProps, SharedDocument } from '@/types/documents.d';
import shared from '@/routes/shared';

interface SharedDocumentLayoutProps {
    children: React.ReactNode;
}

function SharedDocumentLayout({ children }: SharedDocumentLayoutProps) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-background p-4 md:p-8">
            <div className="w-full max-w-4xl">
                <div className="mb-4 flex items-center justify-center">
                    <img
                        src="/logo.svg"
                        alt="Workumi"
                        className="h-10 w-auto"
                    />
                </div>
                {children}
            </div>
        </div>
    );
}

interface PasswordPromptProps {
    token: string;
    documentName: string;
    error?: string;
    onVerified: (document: SharedDocument) => void;
}

function PasswordPrompt({ token, documentName, error: initialError, onVerified }: PasswordPromptProps) {
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(initialError || null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch(shared.verify.url(token), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ password }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Invalid password');
            }

            const data = await response.json();
            if (data.document) {
                onVerified(data.document);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Verification failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col items-center">
            <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-6 shadow-sm">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <Lock className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold">Password Required</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Enter the password to access this document
                        </p>
                    </div>
                </div>

                <div className="rounded-md bg-muted/50 p-3 text-center">
                    <p className="truncate text-sm font-medium">{documentName}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            required
                            autoFocus
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting || !password}
                    >
                        {isSubmitting && <Spinner className="mr-2" />}
                        Verify
                    </Button>
                </form>
            </div>
        </div>
    );
}

interface DocumentViewerProps {
    document: SharedDocument;
    token: string;
}

function DocumentViewer({ document, token }: DocumentViewerProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const handleDownload = async () => {
        setIsDownloading(true);
        setDownloadError(null);

        try {
            const response = await fetch(shared.download.url(token), {
                headers: {
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Download failed');
            }

            const data = await response.json();
            if (data.downloadUrl) {
                // Create a temporary link and trigger download
                const link = window.document.createElement('a');
                link.href = data.downloadUrl;
                link.download = data.fileName || document.name;
                window.document.body.appendChild(link);
                link.click();
                window.document.body.removeChild(link);
            }
        } catch (err) {
            setDownloadError(err instanceof Error ? err.message : 'Download failed');
        } finally {
            setIsDownloading(false);
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border bg-card p-4">
                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-lg font-semibold">{document.name}</h1>
                    <p className="text-sm text-muted-foreground">
                        {formatFileSize(document.fileSize)}
                    </p>
                </div>
                {document.allowDownload && (
                    <Button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="ml-4 shrink-0"
                    >
                        {isDownloading ? (
                            <Spinner className="mr-2" />
                        ) : (
                            <Download className="mr-2 h-4 w-4" />
                        )}
                        Download
                    </Button>
                )}
            </div>

            {downloadError && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    {downloadError}
                </div>
            )}

            <div className="overflow-hidden rounded-lg border bg-card">
                <FilePreview
                    fileUrl={document.previewUrl}
                    mimeType={document.type}
                    fileName={document.name}
                    className="min-h-[60vh]"
                    inModal={false}
                />
            </div>

            <p className="text-center text-xs text-muted-foreground">
                This document is shared via a secure link. View-only access.
            </p>
        </div>
    );
}

interface ExpiredLinkViewProps {
    message?: string;
}

function ExpiredLinkView({ message }: ExpiredLinkViewProps) {
    return (
        <div className="flex flex-col items-center">
            <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-6 text-center shadow-sm">
                <div className="flex flex-col items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold">Link Expired</h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {message || 'This share link has expired and is no longer available.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface NotFoundViewProps {
    message?: string;
}

function NotFoundView({ message }: NotFoundViewProps) {
    return (
        <div className="flex flex-col items-center">
            <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-6 text-center shadow-sm">
                <div className="flex flex-col items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <FileWarning className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold">Document Not Found</h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {message || 'The document you are looking for could not be found.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function SharedDocumentPage({
    document: initialDocument,
    token,
    requiresPassword = false,
    documentName,
    error,
}: SharedDocumentPageProps) {
    const [document, setDocument] = useState<SharedDocument | undefined>(initialDocument);
    const [isPasswordVerified, setIsPasswordVerified] = useState(!requiresPassword);

    const handlePasswordVerified = (verifiedDocument: SharedDocument) => {
        setDocument(verifiedDocument);
        setIsPasswordVerified(true);
    };

    // Handle error states
    if (error) {
        if (error.toLowerCase().includes('expired')) {
            return (
                <SharedDocumentLayout>
                    <ExpiredLinkView message={error} />
                </SharedDocumentLayout>
            );
        }
        return (
            <SharedDocumentLayout>
                <NotFoundView message={error} />
            </SharedDocumentLayout>
        );
    }

    // Password required state
    if (requiresPassword && !isPasswordVerified) {
        return (
            <SharedDocumentLayout>
                <PasswordPrompt
                    token={token}
                    documentName={documentName || 'Protected Document'}
                    onVerified={handlePasswordVerified}
                />
            </SharedDocumentLayout>
        );
    }

    // Document view state
    if (document) {
        return (
            <SharedDocumentLayout>
                <DocumentViewer document={document} token={token} />
            </SharedDocumentLayout>
        );
    }

    // Fallback - should not reach here normally
    return (
        <SharedDocumentLayout>
            <NotFoundView />
        </SharedDocumentLayout>
    );
}
