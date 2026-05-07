import { useState, useEffect, useCallback, Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
    Copy,
    Check,
    Trash2,
    Link2,
    Lock,
    Download,
    AlertCircle,
    Plus,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import { ShareLinkDialog } from './share-link-dialog';
import { AccessLogTable } from './access-log-table';
import type {
    DocumentShareLink,
    ShareLinkManagementProps,
    ShareAccessLog,
} from '@/types/documents.d';
import shareLinks from '@/routes/documents/share-links';
import { getCsrfToken } from '@/lib/csrf';

export function ShareLinkManagement({
    documentId,
    className,
}: ShareLinkManagementProps) {
    const [links, setLinks] = useState<DocumentShareLink[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [linkToDelete, setLinkToDelete] = useState<DocumentShareLink | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [expandedLinkId, setExpandedLinkId] = useState<string | null>(null);
    const [accessLogs, setAccessLogs] = useState<Record<string, ShareAccessLog[]>>({});
    const [loadingLogs, setLoadingLogs] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Convert documentId to number for route helper
    const docId = typeof documentId === 'string' ? parseInt(documentId, 10) : documentId;

    const fetchShareLinks = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(shareLinks.index.url({ document: docId }), {
                headers: {
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error('Failed to fetch share links');
            }

            const data = await response.json();
            setLinks(data.shareLinks || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    }, [docId]);

    useEffect(() => {
        fetchShareLinks();
    }, [fetchShareLinks]);

    const handleCreated = (newLink: DocumentShareLink) => {
        setLinks((prev) => [newLink, ...prev]);
    };

    const handleDelete = async () => {
        if (!linkToDelete) return;

        setIsDeleting(true);
        try {
            const linkId = typeof linkToDelete.id === 'string'
                ? parseInt(linkToDelete.id, 10)
                : linkToDelete.id;
            const response = await fetch(
                shareLinks.destroy.url({
                    document: docId,
                    share_link: linkId,
                }),
                {
                    method: 'DELETE',
                    headers: {
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                    credentials: 'same-origin',
                }
            );

            if (!response.ok) {
                throw new Error('Failed to revoke share link');
            }

            setLinks((prev) => prev.filter((link) => link.id !== linkToDelete.id));
            setLinkToDelete(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to revoke share link');
        } finally {
            setIsDeleting(false);
        }
    };

    const loadAccessLog = async (linkId: string) => {
        if (accessLogs[linkId]) {
            setExpandedLinkId(expandedLinkId === linkId ? null : linkId);
            return;
        }

        setLoadingLogs(linkId);
        try {
            const numericLinkId = parseInt(linkId, 10);
            const response = await fetch(
                shareLinks.show.url({ document: docId, share_link: numericLinkId }),
                {
                    headers: {
                        Accept: 'application/json',
                    },
                    credentials: 'same-origin',
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch access log');
            }

            const data = await response.json();
            setAccessLogs((prev) => ({
                ...prev,
                [linkId]: data.shareLink.accessLog || [],
            }));
            setExpandedLinkId(linkId);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch access log');
        } finally {
            setLoadingLogs(null);
        }
    };

    const copyToClipboard = (link: DocumentShareLink) => {
        const textArea = document.createElement('textarea');
        textArea.value = link.url;

        // Make it visible but off-screen to ensure it can be selected
        textArea.style.position = 'fixed';
        textArea.style.top = '-9999px';
        textArea.style.left = '-9999px';

        document.body.appendChild(textArea);

        // Save current focus
        const activeElement = document.activeElement as HTMLElement;

        textArea.focus();
        textArea.setSelectionRange(0, textArea.value.length);

        let success = false;
        try {
            success = document.execCommand('copy');
        } catch (err) {
            console.error('execCommand error:', err);
        }

        document.body.removeChild(textArea);

        // Restore focus
        if (activeElement) {
            activeElement.focus();
        }

        if (success) {
            setCopiedId(link.id);
            setTimeout(() => setCopiedId(null), 2000);
        } else {
            console.error('execCommand returned false');
            setError('Failed to copy to clipboard');
        }
    };

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(dateString));
    };

    if (isLoading) {
        return (
            <div className={cn('flex items-center justify-center py-8', className)}>
                <Spinner className="h-6 w-6" />
            </div>
        );
    }

    return (
        <div className={cn('space-y-4', className)}>
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Share Links</h3>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                    Create Link
                </Button>
            </div>

            {error && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto"
                        onClick={() => setError(null)}
                    >
                        Dismiss
                    </Button>
                </div>
            )}

            {links.length === 0 ? (
                <div className="rounded-md border border-dashed p-8 text-center">
                    <Link2 className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                        No share links yet. Create one to share this document externally.
                    </p>
                </div>
            ) : (
                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40px]" />
                                <TableHead className="min-w-[120px]">Created</TableHead>
                                <TableHead className="min-w-[100px]">Expires</TableHead>
                                <TableHead className="min-w-[100px]">Status</TableHead>
                                <TableHead className="text-center w-[60px]">Views</TableHead>
                                <TableHead className="text-right w-[80px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {links.map((link) => (
                                <Fragment key={link.id}>
                                    <TableRow>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => loadAccessLog(link.id)}
                                                aria-label={
                                                    expandedLinkId === link.id
                                                        ? 'Hide access log'
                                                        : 'View access log'
                                                }
                                                disabled={loadingLogs === link.id}
                                            >
                                                {loadingLogs === link.id ? (
                                                    <Spinner className="h-4 w-4" />
                                                ) : expandedLinkId === link.id ? (
                                                    <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">
                                                    {formatDate(link.createdAt)}
                                                </span>
                                                {link.creator && (
                                                    <span className="text-xs text-muted-foreground">
                                                        by {link.creator.name}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {link.expiresAt
                                                ? formatDate(link.expiresAt)
                                                : 'Never'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                <Badge
                                                    variant={link.isExpired ? 'destructive' : 'default'}
                                                >
                                                    {link.isExpired ? 'Expired' : 'Active'}
                                                </Badge>
                                                {link.hasPassword && (
                                                    <Badge variant="secondary" className="gap-1">
                                                        <Lock className="h-3 w-3" />
                                                        Protected
                                                    </Badge>
                                                )}
                                                {link.allowDownload && (
                                                    <Badge variant="outline" className="gap-1">
                                                        <Download className="h-3 w-3" />
                                                        Download
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {link.accessCount}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => copyToClipboard(link)}
                                                    aria-label={
                                                        copiedId === link.id
                                                            ? 'Copied'
                                                            : 'Copy link'
                                                    }
                                                    disabled={link.isExpired}
                                                >
                                                    {copiedId === link.id ? (
                                                        <Check className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <Copy className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                                    onClick={() => setLinkToDelete(link)}
                                                    aria-label="Revoke link"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    {expandedLinkId === link.id && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="bg-muted/50 p-4">
                                                <div className="space-y-2">
                                                    <h4 className="font-medium">Access Log</h4>
                                                    <AccessLogTable
                                                        accessLogs={accessLogs[link.id] || []}
                                                        isLoading={loadingLogs === link.id}
                                                    />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <ShareLinkDialog
                documentId={documentId}
                isOpen={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                onCreated={handleCreated}
            />

            <AlertDialog
                open={!!linkToDelete}
                onOpenChange={(open) => !open && setLinkToDelete(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Revoke Share Link</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to revoke this share link? Anyone with the
                            link will no longer be able to access the document. This action
                            cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting && <Spinner className="mr-2" />}
                            Revoke Link
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
