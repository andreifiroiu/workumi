import { useState, useCallback, useEffect } from 'react';
import { FilePreview } from '@/components/work/file-preview';
import { AnnotationLayer } from './annotation-layer';
import { AnnotationPopover } from './annotation-popover';
import { DocumentComments } from './document-comments';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
    DocumentAnnotation,
    AnnotationPosition,
    CreateAnnotationData,
} from '@/types/documents.d';
import { getCsrfToken } from '@/lib/csrf';

interface DocumentPreviewWithAnnotationsProps {
    documentId: string;
    fileUrl: string;
    mimeType: string;
    fileName: string;
    className?: string;
    inModal?: boolean;
}

/**
 * DocumentPreviewWithAnnotations combines file preview with annotation overlay
 * and commenting functionality.
 *
 * Features:
 * - File preview (images, PDFs, Office documents)
 * - Annotation markers overlay
 * - Click-to-create annotations on document
 * - Annotation popover for viewing/replying to threads
 * - Document-level comments in collapsible panel
 */
export function DocumentPreviewWithAnnotations({
    documentId,
    fileUrl,
    mimeType,
    fileName,
    className,
    inModal = false,
}: DocumentPreviewWithAnnotationsProps) {
    // Annotations state
    const [annotations, setAnnotations] = useState<DocumentAnnotation[]>([]);
    const [isLoadingAnnotations, setIsLoadingAnnotations] = useState(true);
    const [currentPage, setCurrentPage] = useState<number | undefined>(undefined);

    // Selected annotation state
    const [selectedAnnotation, setSelectedAnnotation] = useState<DocumentAnnotation | null>(null);

    // New annotation state
    const [newAnnotationPosition, setNewAnnotationPosition] = useState<AnnotationPosition | null>(null);
    const [newAnnotationContent, setNewAnnotationContent] = useState('');
    const [isCreatingAnnotation, setIsCreatingAnnotation] = useState(false);

    // Comments panel state
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);

    // Determine if this is a PDF
    const isPdf = mimeType === 'application/pdf';

    // Fetch annotations from API
    const fetchAnnotations = useCallback(async () => {
        setIsLoadingAnnotations(true);

        try {
            const response = await fetch(`/documents/${documentId}/annotations`, {
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch annotations');
            }

            const data = await response.json();
            setAnnotations(data.annotations || []);
        } catch (err) {
            console.error('Error fetching annotations:', err);
        } finally {
            setIsLoadingAnnotations(false);
        }
    }, [documentId]);

    // Handle annotation click
    const handleAnnotationClick = useCallback((annotation: DocumentAnnotation) => {
        setSelectedAnnotation(annotation);
    }, []);

    // Handle closing annotation popover
    const handleCloseAnnotation = useCallback(() => {
        setSelectedAnnotation(null);
    }, []);

    // Handle creating new annotation - show dialog
    const handleCreateAnnotation = useCallback((position: AnnotationPosition) => {
        setNewAnnotationPosition(position);
        setNewAnnotationContent('');
    }, []);

    // Handle submitting new annotation
    const handleSubmitAnnotation = useCallback(async () => {
        if (!newAnnotationPosition || !newAnnotationContent.trim()) return;

        setIsCreatingAnnotation(true);

        try {
            const data: CreateAnnotationData = {
                page: newAnnotationPosition.page,
                xPercent: newAnnotationPosition.xPercent,
                yPercent: newAnnotationPosition.yPercent,
                content: newAnnotationContent.trim(),
            };

            const response = await fetch(`/documents/${documentId}/annotations`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error('Failed to create annotation');
            }

            // Refresh annotations list
            await fetchAnnotations();

            // Close dialog
            setNewAnnotationPosition(null);
            setNewAnnotationContent('');
        } catch (err) {
            console.error('Error creating annotation:', err);
        } finally {
            setIsCreatingAnnotation(false);
        }
    }, [documentId, newAnnotationPosition, newAnnotationContent, fetchAnnotations]);

    // Handle canceling new annotation
    const handleCancelAnnotation = useCallback(() => {
        setNewAnnotationPosition(null);
        setNewAnnotationContent('');
    }, []);

    // Fetch annotations on mount
    useEffect(() => {
        fetchAnnotations();
    }, [fetchAnnotations]);

    // For PDF: set initial page
    useEffect(() => {
        if (isPdf) {
            setCurrentPage(1);
        }
    }, [isPdf]);

    return (
        <div className={cn('space-y-4', className)}>
            {/* Preview with annotation overlay */}
            <div className="relative" data-testid="document-preview-container">
                {/* File preview */}
                <FilePreview
                    fileUrl={fileUrl}
                    mimeType={mimeType}
                    fileName={fileName}
                    inModal={inModal}
                />

                {/* Annotation layer overlay */}
                {!isLoadingAnnotations && (
                    <AnnotationLayer
                        documentId={documentId}
                        annotations={annotations}
                        currentPage={currentPage}
                        onAnnotationClick={handleAnnotationClick}
                        onCreateAnnotation={handleCreateAnnotation}
                        className="absolute inset-0"
                    />
                )}

                {/* Loading indicator */}
                {isLoadingAnnotations && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                )}
            </div>

            {/* PDF page navigation (simplified - could be enhanced) */}
            {isPdf && currentPage !== undefined && (
                <div className="flex items-center justify-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, (p ?? 1) - 1))}
                        disabled={currentPage <= 1}
                    >
                        Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {currentPage}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => (p ?? 1) + 1)}
                    >
                        Next
                    </Button>
                </div>
            )}

            {/* Toggle comments panel button */}
            <Button
                variant="outline"
                onClick={() => setIsCommentsOpen((prev) => !prev)}
                className="w-full"
            >
                <MessageSquare className="h-4 w-4 mr-2" aria-hidden="true" />
                {isCommentsOpen ? 'Hide Comments' : 'Show Comments'}
            </Button>

            {/* Document comments panel */}
            <DocumentComments
                documentId={documentId}
                isOpen={isCommentsOpen}
                onOpenChange={setIsCommentsOpen}
            />

            {/* Annotation popover */}
            {selectedAnnotation && (
                <AnnotationPopover
                    annotation={selectedAnnotation}
                    documentId={documentId}
                    onClose={handleCloseAnnotation}
                    onReplyAdded={fetchAnnotations}
                    anchorPosition={{
                        x: selectedAnnotation.xPercent,
                        y: selectedAnnotation.yPercent,
                    }}
                />
            )}

            {/* New annotation dialog */}
            <Dialog
                open={newAnnotationPosition !== null}
                onOpenChange={(open) => !open && handleCancelAnnotation()}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Annotation</DialogTitle>
                        <DialogDescription>
                            Add a comment at this position on the document.
                            {isPdf && newAnnotationPosition?.page && (
                                <span className="block mt-1">
                                    Page {newAnnotationPosition.page}
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <Textarea
                            value={newAnnotationContent}
                            onChange={(e) => setNewAnnotationContent(e.target.value)}
                            placeholder="Enter your comment..."
                            className="min-h-[100px]"
                            autoFocus
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={handleCancelAnnotation}
                            disabled={isCreatingAnnotation}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmitAnnotation}
                            disabled={isCreatingAnnotation || !newAnnotationContent.trim()}
                        >
                            {isCreatingAnnotation ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Send className="h-4 w-4 mr-2" aria-hidden="true" />
                            )}
                            Add Annotation
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
