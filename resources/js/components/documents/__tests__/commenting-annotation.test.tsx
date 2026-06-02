import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DocumentComments } from '../document-comments';
import { AnnotationLayer } from '../annotation-layer';
import { AnnotationMarker } from '../annotation-marker';
import type { DocumentAnnotation } from '@/types/documents.d';

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock router for Inertia
vi.mock('@inertiajs/react', () => ({
    router: {
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
        reload: vi.fn(),
    },
    usePage: () => ({
        props: {
            auth: { user: { id: '1', name: 'Test User' } },
        },
    }),
}));

// Sample annotation data for tests
const createMockAnnotation = (overrides: Partial<DocumentAnnotation> = {}): DocumentAnnotation => ({
    id: '1',
    documentId: '100',
    page: null,
    xPercent: 50,
    yPercent: 50,
    isForPdf: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    creator: { id: '1', name: 'Test User' },
    thread: { id: '10', messageCount: 1, lastActivity: new Date().toISOString() },
    preview: { content: 'Test comment', authorName: 'Test User' },
    canEdit: true,
    canDelete: true,
    ...overrides,
});

describe('DocumentComments - Display Thread in Collapsible Panel', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it('displays thread comments in a collapsible panel', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                thread: { id: '1', messageCount: 2, lastActivity: new Date().toISOString() },
                messages: [
                    {
                        id: '1',
                        authorId: '1',
                        authorName: 'Test User',
                        authorType: 'human',
                        timestamp: new Date().toISOString(),
                        content: 'First comment',
                        type: 'note',
                        editedAt: null,
                        canEdit: true,
                        canDelete: true,
                        mentions: [],
                        attachments: [],
                        reactions: [],
                    },
                    {
                        id: '2',
                        authorId: '2',
                        authorName: 'Other User',
                        authorType: 'human',
                        timestamp: new Date().toISOString(),
                        content: 'Second comment',
                        type: 'note',
                        editedAt: null,
                        canEdit: false,
                        canDelete: false,
                        mentions: [],
                        attachments: [],
                        reactions: [],
                    },
                ],
            }),
        });

        render(
            <DocumentComments
                documentId="100"
                isOpen={true}
                onOpenChange={vi.fn()}
            />
        );

        // Wait for comments to load
        await waitFor(() => {
            expect(screen.getByText('First comment')).toBeInTheDocument();
        });

        expect(screen.getByText('Second comment')).toBeInTheDocument();
        expect(screen.getByText('Document Comments')).toBeInTheDocument();
    });

    it('shows empty state when no comments exist', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                thread: null,
                messages: [],
            }),
        });

        render(
            <DocumentComments
                documentId="100"
                isOpen={true}
                onOpenChange={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('No comments yet')).toBeInTheDocument();
        });
    });
});

describe('AnnotationLayer - Marker Positioning on Images', () => {
    it('positions annotation markers using percentage coordinates', () => {
        const annotations = [
            createMockAnnotation({ id: '1', xPercent: 25, yPercent: 75 }),
            createMockAnnotation({ id: '2', xPercent: 80, yPercent: 20 }),
        ];

        render(
            <AnnotationLayer
                documentId="100"
                annotations={annotations}
                onAnnotationClick={vi.fn()}
            />
        );

        const markers = screen.getAllByTestId('annotation-marker');
        expect(markers).toHaveLength(2);

        // Check first marker position (25%, 75%)
        expect(markers[0]).toHaveStyle({ left: '25%', top: '75%' });
        // Check second marker position (80%, 20%)
        expect(markers[1]).toHaveStyle({ left: '80%', top: '20%' });
    });

    it('includes toggle control to show/hide all annotation markers', async () => {
        const user = userEvent.setup();
        const annotations = [createMockAnnotation()];

        render(
            <AnnotationLayer
                documentId="100"
                annotations={annotations}
                onAnnotationClick={vi.fn()}
            />
        );

        // Annotations should be visible by default
        expect(screen.getByTestId('annotation-marker')).toBeInTheDocument();

        // Find and click the toggle button
        const toggleButton = screen.getByRole('button', { name: /hide annotations/i });
        await user.click(toggleButton);

        // Markers should now be hidden
        expect(screen.queryByTestId('annotation-marker')).not.toBeInTheDocument();

        // Toggle back on
        const showButton = screen.getByRole('button', { name: /show annotations/i });
        await user.click(showButton);

        // Markers should be visible again
        expect(screen.getByTestId('annotation-marker')).toBeInTheDocument();
    });
});

describe('AnnotationLayer - Marker Positioning on PDFs with Page Tracking', () => {
    it('only displays annotations for the current PDF page', () => {
        const annotations = [
            createMockAnnotation({ id: '1', page: 1, xPercent: 30, yPercent: 40, isForPdf: true }),
            createMockAnnotation({ id: '2', page: 2, xPercent: 50, yPercent: 60, isForPdf: true }),
            createMockAnnotation({ id: '3', page: 1, xPercent: 70, yPercent: 80, isForPdf: true }),
        ];

        render(
            <AnnotationLayer
                documentId="100"
                annotations={annotations}
                currentPage={1}
                onAnnotationClick={vi.fn()}
            />
        );

        // Only page 1 annotations should be visible
        const markers = screen.getAllByTestId('annotation-marker');
        expect(markers).toHaveLength(2);
    });

    it('shows all annotations when no page is specified (image mode)', () => {
        const annotations = [
            createMockAnnotation({ id: '1', page: null }),
            createMockAnnotation({ id: '2', page: null }),
        ];

        render(
            <AnnotationLayer
                documentId="100"
                annotations={annotations}
                onAnnotationClick={vi.fn()}
            />
        );

        const markers = screen.getAllByTestId('annotation-marker');
        expect(markers).toHaveLength(2);
    });
});

describe('AnnotationMarker - Click to Open Comment Thread', () => {
    it('calls onClick handler when marker is clicked', async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();
        const annotation = createMockAnnotation();

        render(
            <AnnotationMarker
                annotation={annotation}
                index={1}
                onClick={onClick}
            />
        );

        const marker = screen.getByTestId('annotation-marker');
        await user.click(marker);

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('displays marker number', () => {
        const annotation = createMockAnnotation();

        render(
            <AnnotationMarker
                annotation={annotation}
                index={3}
                onClick={vi.fn()}
            />
        );

        expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('includes preview content in accessible aria-label for hover preview', () => {
        // Radix tooltips are difficult to test in jsdom, so we verify the
        // preview content is accessible via aria-label (which Radix uses)
        const annotation = createMockAnnotation({
            preview: { content: 'Hover preview text', authorName: 'Test User' },
        });

        render(
            <AnnotationMarker
                annotation={annotation}
                index={1}
                onClick={vi.fn()}
            />
        );

        const marker = screen.getByTestId('annotation-marker');

        // The aria-label should include the preview content for accessibility
        expect(marker).toHaveAttribute(
            'aria-label',
            expect.stringContaining('Hover preview text')
        );
    });

    it('wraps marker with tooltip when preview is available', () => {
        const annotation = createMockAnnotation({
            preview: { content: 'Preview content here', authorName: 'Test User' },
        });

        render(
            <AnnotationMarker
                annotation={annotation}
                index={1}
                onClick={vi.fn()}
            />
        );

        const marker = screen.getByTestId('annotation-marker');

        // When wrapped with Tooltip, Radix adds data-slot="tooltip-trigger"
        expect(marker).toHaveAttribute('data-slot', 'tooltip-trigger');
    });

    it('applies active state styling when annotation is selected', () => {
        const annotation = createMockAnnotation();

        render(
            <AnnotationMarker
                annotation={annotation}
                index={1}
                onClick={vi.fn()}
                isActive={true}
            />
        );

        const marker = screen.getByTestId('annotation-marker');
        expect(marker).toHaveClass('ring-2');
    });
});
