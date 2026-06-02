import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnnotationMarker } from './annotation-marker';
import type { AnnotationLayerProps, AnnotationPosition, DocumentAnnotation } from '@/types/documents.d';

/**
 * AnnotationLayer component overlays clickable annotation markers on document preview.
 *
 * Features:
 * - Overlay markers on document preview
 * - Calculate positions using percentage coordinates (responsive)
 * - Handle page-specific positioning for PDFs
 * - Toggle control to show/hide all annotation markers
 * - Click-to-create annotation functionality
 * - Default state: annotations visible
 */
export function AnnotationLayer({
    annotations,
    currentPage,
    onAnnotationClick,
    onCreateAnnotation,
    showAnnotations: initialShowAnnotations = true,
    className,
}: AnnotationLayerProps) {
    const [showAnnotations, setShowAnnotations] = useState(initialShowAnnotations);
    const [isCreatingMode, setIsCreatingMode] = useState(false);
    const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);

    // Filter annotations based on current page (for PDFs) or show all (for images)
    const visibleAnnotations = useMemo(() => {
        if (!showAnnotations) return [];

        return annotations.filter((annotation) => {
            // If currentPage is specified, only show annotations for that page
            if (currentPage !== undefined) {
                return annotation.page === currentPage;
            }
            // If no currentPage, show annotations without a page (image mode)
            return annotation.page === null;
        });
    }, [annotations, currentPage, showAnnotations]);

    // Handle clicking on an annotation marker
    const handleAnnotationClick = useCallback(
        (annotation: DocumentAnnotation) => {
            setActiveAnnotationId(annotation.id);
            onAnnotationClick(annotation);
        },
        [onAnnotationClick]
    );

    // Handle clicking on the document to create a new annotation
    const handleLayerClick = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            if (!isCreatingMode || !onCreateAnnotation) return;

            // Get the layer element's bounding rectangle
            const rect = event.currentTarget.getBoundingClientRect();

            // Calculate percentage position from click coordinates
            const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
            const yPercent = ((event.clientY - rect.top) / rect.height) * 100;

            // Clamp values to 0-100
            const clampedX = Math.max(0, Math.min(100, xPercent));
            const clampedY = Math.max(0, Math.min(100, yPercent));

            const position: AnnotationPosition = {
                xPercent: clampedX,
                yPercent: clampedY,
                page: currentPage ?? null,
            };

            onCreateAnnotation(position);
            setIsCreatingMode(false);
        },
        [isCreatingMode, onCreateAnnotation, currentPage]
    );

    // Toggle annotations visibility
    const handleToggleAnnotations = useCallback(() => {
        setShowAnnotations((prev) => !prev);
    }, []);

    // Toggle creating mode
    const handleToggleCreateMode = useCallback(() => {
        setIsCreatingMode((prev) => !prev);
    }, []);

    return (
        <div className={cn('relative', className)}>
            {/* Control buttons */}
            <div className="absolute top-2 right-2 z-20 flex gap-1">
                {onCreateAnnotation && (
                    <Button
                        variant={isCreatingMode ? 'default' : 'secondary'}
                        size="sm"
                        onClick={handleToggleCreateMode}
                        aria-label={isCreatingMode ? 'Cancel adding annotation' : 'Add annotation'}
                        className="h-8 px-2"
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        <span className="ml-1 hidden sm:inline">
                            {isCreatingMode ? 'Cancel' : 'Add'}
                        </span>
                    </Button>
                )}

                <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleToggleAnnotations}
                    aria-label={showAnnotations ? 'Hide annotations' : 'Show annotations'}
                    className="h-8 px-2"
                >
                    {showAnnotations ? (
                        <>
                            <EyeOff className="h-4 w-4" aria-hidden="true" />
                            <span className="ml-1 hidden sm:inline">Hide</span>
                        </>
                    ) : (
                        <>
                            <Eye className="h-4 w-4" aria-hidden="true" />
                            <span className="ml-1 hidden sm:inline">Show</span>
                        </>
                    )}
                </Button>
            </div>

            {/* Click layer for creating annotations */}
            <div
                className={cn(
                    'absolute inset-0 z-0',
                    isCreatingMode && 'cursor-crosshair'
                )}
                onClick={handleLayerClick}
                role={isCreatingMode ? 'button' : undefined}
                aria-label={isCreatingMode ? 'Click to place annotation' : undefined}
                data-testid="annotation-layer"
            >
                {/* Creating mode indicator */}
                {isCreatingMode && (
                    <div className="absolute inset-0 border-2 border-dashed border-primary/50 pointer-events-none rounded-lg">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background/90 px-3 py-2 rounded-md shadow-sm">
                            <p className="text-sm text-muted-foreground">
                                Click anywhere to add an annotation
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Annotation markers */}
            {visibleAnnotations.map((annotation, index) => (
                <AnnotationMarker
                    key={annotation.id}
                    annotation={annotation}
                    index={index + 1}
                    onClick={() => handleAnnotationClick(annotation)}
                    isActive={activeAnnotationId === annotation.id}
                />
            ))}

            {/* Annotation count indicator */}
            {annotations.length > 0 && (
                <div className="absolute bottom-2 left-2 z-20">
                    <span className="text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
                        {showAnnotations
                            ? `${visibleAnnotations.length} annotation${visibleAnnotations.length !== 1 ? 's' : ''}`
                            : `${annotations.length} hidden`}
                    </span>
                </div>
            )}
        </div>
    );
}
